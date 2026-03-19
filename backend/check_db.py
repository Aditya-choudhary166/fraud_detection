import mysql.connector

db = mysql.connector.connect(
    host='localhost',
    user='root',
    password='9079285970',
    database='fraudshield_db'
)
cur = db.cursor()
cur.execute("SELECT username, password_hash FROM users")
rows = cur.fetchall()
for row in rows:
    print(row)