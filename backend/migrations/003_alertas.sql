-- Motor de avisos por email (bajadas de precio, alertas por destino, barcos seguidos)
CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY, email TEXT NOT NULL, kind TEXT, subject TEXT, html TEXT, text TEXT, k TEXT UNIQUE, status TEXT DEFAULT 'pending', err TEXT, created TEXT DEFAULT (datetime('now')), sent TEXT);
CREATE INDEX IF NOT EXISTS outbox_status ON outbox(status);
CREATE TABLE IF NOT EXISTS seen (k TEXT PRIMARY KEY, created TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS unsub (email TEXT PRIMARY KEY, created TEXT DEFAULT (datetime('now')));
