import sqlite3
import os

DB_PATH = "bookmygadi.db"
def fix_db():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Rides Table Updates
        cursor.execute("PRAGMA table_info(rides)")
        columns = [row[1] for row in cursor.fetchall()]
        
        column_updates = {
            "accepted_at": "DATETIME",
            "arrived_at": "DATETIME",
            "started_at": "DATETIME",
            "completed_at": "DATETIME"
        }
        
        for col, col_type in column_updates.items():
            if col not in columns:
                print(f"Adding '{col}' column to rides...")
                cursor.execute(f"ALTER TABLE rides ADD COLUMN {col} {col_type}")
                conn.commit()
                print(f"Column '{col}' added successfully.")
            else:
                print(f"Column '{col}' already exists in rides.")

        # Users Table Updates
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [row[1] for row in cursor.fetchall()]
        
        if "fcm_token" not in user_columns:
            print("Adding 'fcm_token' column to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255)")
            conn.commit()
            print("Column 'fcm_token' added successfully.")
        else:
            print("Column 'fcm_token' already exists in users.")

    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    fix_db()
