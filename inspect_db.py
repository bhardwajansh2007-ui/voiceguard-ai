import sqlite3
c = sqlite3.connect('voiceguard.db')
cur = c.cursor()
tables = [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
for t in tables:
    count = cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"{t}: {count}")
    if count > 0 and t not in ('system_configurations', 'users'):
        for row in cur.execute(f"SELECT * FROM {t} LIMIT 3").fetchall():
            print("  ", row)
