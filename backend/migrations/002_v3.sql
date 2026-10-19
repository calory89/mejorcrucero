-- v3: opiniones verificadas y moderación automática
ALTER TABLE posts ADD COLUMN verified INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN mod TEXT;
CREATE INDEX IF NOT EXISTS posts_parent ON posts(parent);
CREATE INDEX IF NOT EXISTS posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS events_name ON events(name, created);
