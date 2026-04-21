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
        # Check columns in ride_preferences
        cursor.execute("PRAGMA table_info(ride_preferences)")
        columns = [row[1] for row in cursor.fetchall()]
        
        column_updates = {
            "booking_mode": "VARCHAR(30) DEFAULT 'normal'",
            "market_rate": "INTEGER",
            "supervisor_name": "VARCHAR(120)",
            "supervisor_phone": "VARCHAR(20)",
            "vehicle_count": "INTEGER DEFAULT 1",
            "advance_payment_status": "VARCHAR(20) DEFAULT 'pending'",
            "advance_amount": "INTEGER DEFAULT 0"
        }
        
        for col, col_type in column_updates.items():
            if col not in columns:
                print(f"Adding '{col}' column...")
                cursor.execute(f"ALTER TABLE ride_preferences ADD COLUMN {col} {col_type}")
                conn.commit()
                print(f"Column '{col}' added successfully.")
            else:
                print(f"Column '{col}' already exists.")

    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_db()
