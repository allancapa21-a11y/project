const BASE = "/api";

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data: { username: string; password: string }) =>
    req("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => req("/auth/logout", { method: "POST" }),
  getMe: () => req<{ id: number; username: string }>("/auth/me"),

  // Settings
  getSettings: () => req<Settings>("/settings"),
  updateSettings: (data: Partial<Settings>) =>
    req<Settings>("/settings", { method: "PATCH", body: JSON.stringify(data) }),

  // Guests
  listGuests: (params?: { search?: string }) => {
    const qs = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
    return req<Guest[]>(`/guests${qs}`);
  },
  createGuest: (data: { name: string }) =>
    req<Guest>("/guests", { method: "POST", body: JSON.stringify(data) }),
  updateGuest: (id: number, data: { name: string }) =>
    req<Guest>(`/guests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGuest: (id: number) => req(`/guests/${id}`, { method: "DELETE" }),
  assignSeat: (id: number, data: { tableId: number | null; seatNumber: number | null }) =>
    req<Guest>(`/guests/${id}/seat`, { method: "PATCH", body: JSON.stringify(data) }),
  lookupGuest: (q: string) =>
    req<{ guest: Guest; table: Table | null }>(`/guests/lookup?q=${encodeURIComponent(q)}`),

  // Tables
  listTables: () => req<TableWithGuests[]>("/tables"),
  createTable: (data: { name: string; maxSeats: number }) =>
    req<Table>("/tables", { method: "POST", body: JSON.stringify(data) }),
  updateTable: (id: number, data: Partial<Table>) =>
    req<Table>(`/tables/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTable: (id: number) => req(`/tables/${id}`, { method: "DELETE" }),

  // Dashboard
  getDashboard: () => req<Dashboard>("/dashboard"),
};

export interface Settings {
  id: number;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  backgroundImage: string | null;
  eventName: string;
  eventDate: string | null;
}

export interface Guest {
  id: number;
  name: string;
  code: string;
  tableId: number | null;
  tableName: string | null;
  seatNumber: number | null;
  createdAt?: string;
}

export interface Table {
  id: number;
  name: string;
  maxSeats: number;
  posX?: number | null;
  posY?: number | null;
  posWidth?: number | null;
  posHeight?: number | null;
}

export interface TableWithGuests extends Table {
  seatedCount: number;
  guests: { id: number; name: string; code: string; seatNumber: number | null }[];
}

export interface Dashboard {
  totalGuests: number;
  seatedGuests: number;
  unseatedGuests: number;
  totalTables: number;
  totalSeats: number;
  occupancyRate: number;
  tablesWithAvailability: {
    id: number; name: string; maxSeats: number; seatedCount: number; availableSeats: number;
  }[];
}
