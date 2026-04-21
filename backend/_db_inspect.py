import sqlite3
conn = sqlite3.connect('bookmygadi.db')
cur = conn.cursor()
rows = cur.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name").fetchall()
print('TABLES', len(rows))
for (name,) in rows:
    try:
        cnt = cur.execute(f"select count(*) from {name}").fetchone()[0]
    except Exception as e:
        cnt = f"ERR:{e}"
    print(f"{name}: {cnt}")
conn.close()
