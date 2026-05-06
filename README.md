# Wedding Seating System — React + MySQL

A full-stack wedding seating management app built with React (Vite + TypeScript) and Express.js with MySQL.

## Features

- **Public guest lookup**: Guests type their name or code and see their assigned table and seat
- **QR code scanning**: Guests can scan a QR code from their invitation
- **Floor plan viewer**: Shows a visual map with the guest's table highlighted
- **Admin dashboard**: Overview of total guests, seated/unseated, occupancy rate, table availability
- **Guest management**: Add, edit, delete guests; assign seats; download QR codes
- **Table management**: Create tables with capacities; view assigned guests
- **Floor plan editor**: Drag tables to arrange them visually
- **Theme settings**: Event name, date, colors with color picker, font, background image — all applied live

---

## Requirements

- **Node.js 18+** — https://nodejs.org
- **MySQL 8.0+** — https://dev.mysql.com/downloads
- **npm** or **pnpm**

---

## Setup

### 1. Set up the database

Log into MySQL and run the schema file:

```bash
mysql -u root -p < server/schema.sql
```

This creates the `wedding_seating` database, all tables, and the default admin user.

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MySQL credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=wedding_seating
SESSION_SECRET=change-me-to-a-long-random-string
PORT=3001
```

### 3. Install server dependencies

```bash
cd server
npm install
```

### 4. Install client dependencies

```bash
cd client
npm install
```

---

## Running in Development

Open two terminals:

**Terminal 1 — API Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 — React Frontend:**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173 (proxies /api to port 3001)
```

Open `http://localhost:5173` in your browser.

---

## Building for Production

```bash
# 1. Build the React client
cd client
npm run build
# Output goes to client/dist/

# 2. Start the server (it serves the built client)
cd server
node server.js
# Open http://localhost:3001
```

---

## Default Admin Credentials

| Username | Password  |
|----------|-----------|
| admin    | admin123  |

Go to `/admin/login` to sign in.

To change the password, run this SQL (replace `newpassword` with your password):

```sql
USE wedding_seating;
UPDATE users SET password_hash = SHA2(CONCAT('newpassword', 'wedding_salt_2024'), 256) WHERE username = 'admin';
```

---

## Project Structure

```
wedding-seating-system/
├── server/
│   ├── server.js          # Express API — all routes + MySQL logic
│   ├── schema.sql         # MySQL schema + default data
│   ├── package.json
│   └── .env.example
└── client/
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │   ├── lib/
    │   │   ├── api.ts         # All API fetch functions
    │   │   ├── hex-to-hsl.ts  # Color conversion utilities
    │   │   └── utils.ts
    │   ├── hooks/
    │   │   ├── use-apply-theme.ts
    │   │   └── use-toast.ts
    │   ├── components/
    │   │   ├── theme-provider.tsx
    │   │   ├── layout/admin-layout.tsx
    │   │   └── ui/            # shadcn/ui components
    │   └── pages/
    │       ├── index.tsx      # Public guest lookup
    │       └── admin/
    │           ├── login.tsx
    │           ├── dashboard.tsx
    │           ├── guests.tsx
    │           ├── tables.tsx
    │           ├── layout.tsx
    │           └── theme.tsx
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── package.json
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | — | Admin login |
| POST | /api/auth/logout | — | Admin logout |
| GET | /api/auth/me | — | Get current session |
| GET | /api/settings | — | Get theme/event settings |
| PATCH | /api/settings | Admin | Update settings |
| GET | /api/guests?search= | Admin | List all guests |
| POST | /api/guests | Admin | Add a guest |
| PATCH | /api/guests/:id | Admin | Update guest name |
| DELETE | /api/guests/:id | Admin | Delete a guest |
| PATCH | /api/guests/:id/seat | Admin | Assign/unassign a seat |
| GET | /api/guests/lookup?q= | — | Public guest lookup |
| GET | /api/tables | — | List tables with guests |
| POST | /api/tables | Admin | Create a table |
| PATCH | /api/tables/:id | Admin | Update table (name/seats/position) |
| DELETE | /api/tables/:id | Admin | Delete a table |
| GET | /api/dashboard | Admin | Dashboard stats |
