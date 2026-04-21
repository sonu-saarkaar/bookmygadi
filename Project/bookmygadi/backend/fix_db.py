import sqlite3

def add_column_if_not_exists(cursor, table, col_name, col_type):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
        print(f"Added {col_name} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"Column {col_name} already exists in {table}")
        else:
            print(f"Error adding {col_name}: {e}")

conn = sqlite3.connect('bookmygadi.db')
cursor = conn.cursor()

# drivers table updates
add_column_if_not_exists(cursor, 'drivers', 'blocked_by', 'VARCHAR(120)')
add_column_if_not_exists(cursor, 'drivers', 'blocked_reason', 'TEXT')
add_column_if_not_exists(cursor, 'drivers', 'blocked_at', 'DATETIME')

conn.commit()
conn.close()

print("Done.")
