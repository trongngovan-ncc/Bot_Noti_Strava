import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'strava_bot.db')

schema = '''
CREATE TABLE IF NOT EXISTS athletes (
  strava_athlete_id INTEGER PRIMARY KEY,
  mezon_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  athlete_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  activity_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('strava', 'manual')),
  strava_athlete_id INTEGER NOT NULL,
  sport_type TEXT,
  activity_name TEXT,
  distance_m REAL,
  duration_s INTEGER,
  start_date_local DATETIME,
  timezone TEXT,
  private BOOLEAN DEFAULT 0,
  deleted BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strava_athlete_id) REFERENCES athletes(strava_athlete_id) ON DELETE CASCADE
);
'''

def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(schema)
        print('Database initialized successfully!')
    finally:
        conn.close()

if __name__ == '__main__':
    main()
