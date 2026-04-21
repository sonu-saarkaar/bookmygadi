import sqlite3

def fix_db():
    conn = sqlite3.connect('bookmygadi.db')
    columns = [
        ("status", "VARCHAR(40) DEFAULT 'active'"),
        ("is_blocked", "BOOLEAN DEFAULT False"),
        ("blocked_reason", "VARCHAR(500)"),
        ("driver_status", "VARCHAR(20)"),
        ("fcm_token", "VARCHAR(255)"),
        ("total_rides", "INTEGER DEFAULT 0"),
        ("total_spending", "FLOAT DEFAULT 0.0"),
        ("last_active_at", "DATETIME"),
        ("referral_source", "VARCHAR(100)")
    ]
    for col, definition in columns:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
            print(f"Column '{col}' added successfully to 'users'.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e).lower():
                print(f"OperationalError on {col}: {e}")
        except Exception as e:
            print(f"Exception on {col}: {e}")
    conn.commit()
    conn.close()

if __name__ == '__main__':
    fix_db()
