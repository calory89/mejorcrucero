-- MejorCrucero API — esquema D1 (SQLite)
CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, email TEXT NOT NULL, source TEXT, created TEXT DEFAULT (datetime('now')), UNIQUE(email, source));
CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY, email TEXT, kind TEXT, payload TEXT, created TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email_hash TEXT, cruises INTEGER DEFAULT 0, lines TEXT, created TEXT DEFAULT (datetime('now')));
-- thread: 'barco:slug' | 'salida:slug:fecha' | 'camarote:slug:numero' | 'perfil:userId'
-- kind: comment | review | question | answer | cabin | excursion | diary | poll
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY, thread TEXT NOT NULL, parent INTEGER, user_id TEXT, name TEXT NOT NULL, kind TEXT NOT NULL,
  body TEXT, rating TEXT, cabin TEXT, video TEXT, votes INTEGER DEFAULT 0, reports INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0,
  ip_hash TEXT, created TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS posts_thread ON posts(thread, hidden, created);
CREATE TABLE IF NOT EXISTS votes (post_id INTEGER, voter TEXT, PRIMARY KEY(post_id, voter));
CREATE TABLE IF NOT EXISTS members (thread TEXT, user_id TEXT, name TEXT, created TEXT DEFAULT (datetime('now')), PRIMARY KEY(thread, user_id));
CREATE TABLE IF NOT EXISTS follows (email TEXT, thread TEXT, created TEXT DEFAULT (datetime('now')), PRIMARY KEY(email, thread));
CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY, target TEXT, reason TEXT, page TEXT, created TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, name TEXT, page TEXT, target TEXT, variant TEXT, created TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS ratelimit (key TEXT PRIMARY KEY, n INTEGER, window TEXT);
CREATE TABLE IF NOT EXISTS summaries (thread TEXT PRIMARY KEY, body TEXT, posts INTEGER, created TEXT DEFAULT (datetime('now')));
-- 004 (24-oct-2026): encuestas rápidas. Las columnas posts.edit_hash y users.expert se añadieron con migrations/004_comunidad.sql
CREATE TABLE IF NOT EXISTS polls (poll TEXT NOT NULL, option TEXT NOT NULL, voter TEXT NOT NULL, created TEXT DEFAULT (datetime('now')), PRIMARY KEY (poll, voter));
