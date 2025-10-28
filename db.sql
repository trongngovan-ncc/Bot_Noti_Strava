CREATE TABLE athletes (
  mezon_user_id TEXT PRIMARY KEY,
  strava_athlete_id INTEGER,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  athlete_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, mezon_avatar TEXT DEFAULT '');

CREATE TABLE activities (
  activity_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('strava', 'manual')),
  mezon_user_id TEXT NOT NULL,
  sport_type TEXT,
  activity_name TEXT,
  distance_m REAL,
  duration_s INTEGER,
  start_date_local DATETIME,
  timezone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
  photo TEXT, 
  map TEXT,
  FOREIGN KEY (mezon_user_id) REFERENCES athletes(mezon_user_id) ON DELETE CASCADE
);

