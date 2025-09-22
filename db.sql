


  -- Bảng lưu athletes 
  CREATE TABLE athletes (
    strava_athlete_id INTEGER PRIMARY KEY,
    mezon_user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    athlete_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mezon_user_id) REFERENCES strava_apps(mezon_user_id) ON DELETE CASCADE
  );


  -- Bảng lưu activities
  CREATE TABLE activities (
    activity_id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK(source IN ('strava', 'manual')),
    strava_athlete_id INTEGER NOT NULL,
    sport_type TEXT,
    activity_name TEXT,
    distance_m REAL,
    duration_s INTEGER,
    start_date_local DATETIME,
    deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (strava_athlete_id) REFERENCES athletes(strava_athlete_id) ON DELETE CASCADE
  );