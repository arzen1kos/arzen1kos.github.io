PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Single-row identity shown on the default panel.
CREATE TABLE IF NOT EXISTS profile (
  id       INTEGER PRIMARY KEY CHECK (id = 1),
  name     TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  bio      TEXT NOT NULL DEFAULT ''
);

-- Dates are 'YYYY-MM'. end_date NULL = current role.
-- details: one bullet per line (shown on the expanded page).
CREATE TABLE IF NOT EXISTS experience (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  organisation TEXT NOT NULL,
  location     TEXT NOT NULL DEFAULT '',
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  summary      TEXT NOT NULL DEFAULT '',
  details      TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  visible      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS skill_category (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#4cc9f0',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skill (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES skill_category(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS soft_skill (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- repo_full_name ('owner/repo') links a project to a GitHub repo found via your tokens.
-- display_name / description / languages override what GitHub says, for this panel only.
-- languages: comma separated; blank = use the repo's detected languages.
CREATE TABLE IF NOT EXISTS project (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_full_name TEXT,
  display_name   TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  languages      TEXT NOT NULL DEFAULT '',
  color          TEXT NOT NULL DEFAULT '#2e7d32',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  visible        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS course (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  tags       TEXT NOT NULL DEFAULT '[]',
  year       TEXT NOT NULL CHECK (year IN ('y1', 'y2', 'y3')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_project (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id  INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  UNIQUE (course_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_category ON skill(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_repo   ON project(repo_full_name);
