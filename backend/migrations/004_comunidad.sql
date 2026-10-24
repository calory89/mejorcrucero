-- Comunidad: editar/borrar con clave, expertos y encuestas rápidas
ALTER TABLE posts ADD COLUMN edit_hash TEXT;
ALTER TABLE users ADD COLUMN expert INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS polls (poll TEXT NOT NULL, option TEXT NOT NULL, voter TEXT NOT NULL, created TEXT DEFAULT (datetime('now')), PRIMARY KEY (poll, voter));
