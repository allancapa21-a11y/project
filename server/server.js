const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── DB ─────────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'wedding_seating',
  waitForConnections: true,
  connectionLimit: 10,
});

const SALT = 'wedding_salt_2024';
const hashPassword = (p) => crypto.createHash('sha256').update(p + SALT).digest('hex');

function generateCode(name) {
  const base = name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  return base + crypto.randomBytes(2).toString('hex').toUpperCase();
}

async function ensureSettings() {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
  if (rows.length === 0) {
    await pool.query('INSERT INTO settings (id) VALUES (1)');
    const [r] = await pool.query('SELECT * FROM settings WHERE id = 1');
    return r[0];
  }
  return rows[0];
}

// ── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'wedding-seating-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

function requireAdmin(req, res, next) {
  if (!req.session?.adminId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ── AUTH ────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const hash = hashPassword(password);
  const [rows] = await pool.query('SELECT id, username FROM users WHERE username = ? AND password_hash = ?', [username, hash]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.adminId = rows[0].id;
  req.session.adminUsername = rows[0].username;
  res.json({ id: rows[0].id, username: rows[0].username });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.adminId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ id: req.session.adminId, username: req.session.adminUsername });
});

// ── SETTINGS ────────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  const s = await ensureSettings();
  res.json({
    id: s.id,
    primaryColor: s.primary_color,
    secondaryColor: s.secondary_color,
    fontFamily: s.font_family,
    backgroundImage: s.background_image || null,
    eventName: s.event_name,
    eventDate: s.event_date || null,
  });
});

app.patch('/api/settings', requireAdmin, async (req, res) => {
  const { primaryColor, secondaryColor, fontFamily, backgroundImage, eventName, eventDate } = req.body;
  await ensureSettings();
  await pool.query(
    'UPDATE settings SET primary_color=?, secondary_color=?, font_family=?, background_image=?, event_name=?, event_date=? WHERE id=1',
    [primaryColor || '#d4a574', secondaryColor || '#8b5e3c', fontFamily || "'Playfair Display', serif",
     backgroundImage || null, eventName || 'Our Wedding', eventDate || null]
  );
  const s = await ensureSettings();
  res.json({
    id: s.id, primaryColor: s.primary_color, secondaryColor: s.secondary_color,
    fontFamily: s.font_family, backgroundImage: s.background_image || null,
    eventName: s.event_name, eventDate: s.event_date || null,
  });
});

// ── GUESTS ──────────────────────────────────────────────────────────────────
app.get('/api/guests', requireAdmin, async (req, res) => {
  const search = req.query.search || '';
  const [rows] = await pool.query(
    `SELECT g.*, t.name AS table_name FROM guests g LEFT JOIN tables t ON t.id = g.table_id
     WHERE g.name LIKE ? OR g.code LIKE ? ORDER BY g.name`,
    [`%${search}%`, `%${search}%`]
  );
  res.json(rows.map(g => ({
    id: g.id, name: g.name, code: g.code,
    tableId: g.table_id || null, tableName: g.table_name || null,
    seatNumber: g.seat_number || null, createdAt: g.created_at,
  })));
});

app.post('/api/guests', requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const code = generateCode(name.trim());
  const [result] = await pool.query('INSERT INTO guests (name, code) VALUES (?, ?)', [name.trim(), code]);
  res.status(201).json({ id: result.insertId, name: name.trim(), code, tableId: null, tableName: null, seatNumber: null });
});

app.patch('/api/guests/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  await pool.query('UPDATE guests SET name = ? WHERE id = ?', [name.trim(), id]);
  const [rows] = await pool.query('SELECT g.*, t.name AS table_name FROM guests g LEFT JOIN tables t ON t.id = g.table_id WHERE g.id = ?', [id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const g = rows[0];
  res.json({ id: g.id, name: g.name, code: g.code, tableId: g.table_id || null, tableName: g.table_name || null, seatNumber: g.seat_number || null });
});

app.delete('/api/guests/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM guests WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

app.patch('/api/guests/:id/seat', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { tableId, seatNumber } = req.body;
  if (tableId && seatNumber) {
    const [check] = await pool.query(
      'SELECT id FROM guests WHERE table_id = ? AND seat_number = ? AND id != ?',
      [tableId, seatNumber, id]
    );
    if (check.length) return res.status(409).json({ error: 'Seat already taken by another guest' });
  }
  await pool.query('UPDATE guests SET table_id = ?, seat_number = ? WHERE id = ?',
    [tableId || null, seatNumber || null, id]);
  const [rows] = await pool.query('SELECT g.*, t.name AS table_name FROM guests g LEFT JOIN tables t ON t.id = g.table_id WHERE g.id = ?', [id]);
  const g = rows[0];
  res.json({ id: g.id, name: g.name, code: g.code, tableId: g.table_id || null, tableName: g.table_name || null, seatNumber: g.seat_number || null });
});

app.get('/api/guests/lookup', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });
  const [rows] = await pool.query(
    `SELECT g.*, t.name AS table_name, t.pos_x, t.pos_y, t.pos_width, t.pos_height, t.max_seats
     FROM guests g LEFT JOIN tables t ON t.id = g.table_id
     WHERE g.code = ? OR g.name LIKE ? LIMIT 1`,
    [q, `%${q}%`]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const g = rows[0];
  const table = g.table_id ? {
    id: g.table_id, name: g.table_name, maxSeats: g.max_seats,
    posX: g.pos_x, posY: g.pos_y, posWidth: g.pos_width, posHeight: g.pos_height,
  } : null;
  res.json({
    guest: { id: g.id, name: g.name, code: g.code, tableId: g.table_id || null, tableName: g.table_name || null, seatNumber: g.seat_number || null },
    table,
  });
});

// ── TABLES ──────────────────────────────────────────────────────────────────
app.get('/api/tables', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(g.id) AS seated_count,
     JSON_ARRAYAGG(IF(g.id IS NULL, NULL, JSON_OBJECT('id', g.id, 'name', g.name, 'code', g.code, 'seatNumber', g.seat_number))) AS guests_json
     FROM tables t LEFT JOIN guests g ON g.table_id = t.id
     GROUP BY t.id ORDER BY t.name`
  );
  res.json(rows.map(t => {
    let guests = [];
    try {
      const raw = JSON.parse(t.guests_json || '[]');
      guests = raw.filter(Boolean).map(g => ({ id: g.id, name: g.name, code: g.code, seatNumber: g.seatNumber || null }));
    } catch {}
    return {
      id: t.id, name: t.name, maxSeats: t.max_seats,
      posX: t.pos_x, posY: t.pos_y, posWidth: t.pos_width, posHeight: t.pos_height,
      seatedCount: Number(t.seated_count), createdAt: t.created_at, guests,
    };
  }));
});

app.post('/api/tables', requireAdmin, async (req, res) => {
  const { name, maxSeats } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const [result] = await pool.query('INSERT INTO tables (name, max_seats) VALUES (?, ?)', [name.trim(), maxSeats || 8]);
  res.status(201).json({ id: result.insertId, name: name.trim(), maxSeats: maxSeats || 8, posX: null, posY: null, posWidth: null, posHeight: null, seatedCount: 0, guests: [] });
});

app.patch('/api/tables/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, maxSeats, posX, posY, posWidth, posHeight } = req.body;
  const [existing] = await pool.query('SELECT * FROM tables WHERE id = ?', [id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const t = existing[0];
  await pool.query(
    'UPDATE tables SET name=?, max_seats=?, pos_x=?, pos_y=?, pos_width=?, pos_height=? WHERE id=?',
    [name ?? t.name, maxSeats ?? t.max_seats, posX !== undefined ? posX : t.pos_x,
     posY !== undefined ? posY : t.pos_y, posWidth !== undefined ? posWidth : t.pos_width,
     posHeight !== undefined ? posHeight : t.pos_height, id]
  );
  const [rows] = await pool.query('SELECT * FROM tables WHERE id = ?', [id]);
  const r = rows[0];
  res.json({ id: r.id, name: r.name, maxSeats: r.max_seats, posX: r.pos_x, posY: r.pos_y, posWidth: r.pos_width, posHeight: r.pos_height });
});

app.delete('/api/tables/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await pool.query('UPDATE guests SET table_id = NULL, seat_number = NULL WHERE table_id = ?', [id]);
  await pool.query('DELETE FROM tables WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ── DASHBOARD ───────────────────────────────────────────────────────────────
app.get('/api/dashboard', requireAdmin, async (req, res) => {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM guests');
  const [[{ seated }]] = await pool.query('SELECT COUNT(*) AS seated FROM guests WHERE table_id IS NOT NULL');
  const [[{ tables }]] = await pool.query('SELECT COUNT(*) AS tables FROM tables');
  const [[{ seats }]] = await pool.query('SELECT COALESCE(SUM(max_seats), 0) AS seats FROM tables');
  const [avail] = await pool.query(
    `SELECT t.id, t.name, t.max_seats AS maxSeats, COUNT(g.id) AS seatedCount
     FROM tables t LEFT JOIN guests g ON g.table_id = t.id GROUP BY t.id ORDER BY t.name`
  );
  res.json({
    totalGuests: Number(total), seatedGuests: Number(seated),
    unseatedGuests: Number(total) - Number(seated), totalTables: Number(tables),
    totalSeats: Number(seats),
    occupancyRate: Number(seats) > 0 ? (Number(seated) / Number(seats)) * 100 : 0,
    tablesWithAvailability: avail.map(t => ({
      id: t.id, name: t.name, maxSeats: Number(t.maxSeats),
      seatedCount: Number(t.seatedCount),
      availableSeats: Number(t.maxSeats) - Number(t.seatedCount),
    })),
  });
});

// ── SPA FALLBACK ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
