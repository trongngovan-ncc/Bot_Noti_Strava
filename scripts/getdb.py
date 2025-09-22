import sqlite3

DB_PATH = 'data/strava_bot.db'

def print_table(cursor, table):
    print(f"\n--- {table} ---")
    for row in cursor.execute(f"SELECT * FROM {table}"):
        print(row)

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print_table(cursor, 'athletes')
    print_table(cursor, 'activities')
    conn.close()

if __name__ == '__main__':
    main()