import sqlite3
import os

DB_PATH = 'backend/bookmygadi.db'
if not os.path.exists(DB_PATH):
    print("DB not found at", DB_PATH)
else:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    columns = {"city": "VARCHAR(100)", "bio": "VARCHAR(500)", "emergency_number": "VARCHAR(20)", "avatar_data": "TEXT"}
    for col, ctype in columns.items():
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {ctype}")
            print(f"Added {col}")
        except Exception as e:
            print(f"Skipped {col}:", e)
    conn.commit()
    conn.close()
