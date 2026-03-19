import bcrypt
import mysql.connector

password = b'admin123'
hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode()

db = mysql.connector.connect(
    host='localhost',
    user='root',
    password='9079285970',
    database='fraudshield_db'
)
cur = db.cursor()
cur.execute("UPDATE users SET password_hash = %s WHERE username = 'admin'", (hashed,))
cur.execute("UPDATE users SET password_hash = %s WHERE username = 'analyst1'", (hashed,))
db.commit()
print("Password fix ho gaya! Login karo: admin / admin123")