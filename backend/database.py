"""
FraudShield - Database Module
MySQL connection and query helpers using mysql-connector-python.
"""
from dotenv import load_dotenv
load_dotenv()

import mysql.connector
from mysql.connector import pooling
import os
from datetime import datetime

# ─── Connection Pool ────────────────────────────────────────────────────────

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', '9079285970'),
    'database': os.getenv('DB_NAME', 'fraudshield_db'),
    'autocommit': True,
     'auth_plugin': 'mysql_native_password',
}

_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="fraudshield_pool",
            pool_size=5,
            **DB_CONFIG
        )
    return _pool


def get_connection():
    return get_pool().get_connection()


# ─── Transaction CRUD ────────────────────────────────────────────────────────

def save_transaction(txn: dict, user_id: int = None) -> bool:
    """Save a transaction record to DB."""
    sql = """
        INSERT INTO transactions (
            id, type, amount, old_balance_orig, new_balance_orig,
            old_balance_dest, new_balance_dest, transaction_hour,
            location, is_fraud, fraud_probability, ml_model_used, analyzed_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    values = (
        txn['id'], txn['type'], txn['amount'],
        txn.get('oldBalanceOrig', 0), txn.get('newBalanceOrig', 0),
        txn.get('oldBalanceDest', 0), txn.get('newBalanceDest', 0),
        txn.get('hour', 12), txn.get('location', None),
        txn['isFraud'], txn.get('probability', 0),
        txn.get('model', 'Random Forest'), user_id
    )
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, values)
        # Auto-create alert for high-fraud
        if txn['isFraud'] and txn.get('probability', 0) > 70:
            level = 'CRITICAL' if txn.get('probability', 0) > 85 else 'HIGH'
            cur.execute(
                "INSERT INTO fraud_alerts (transaction_id, alert_level, alert_message) VALUES (%s, %s, %s)",
                (txn['id'], level, f"Fraud detected with {txn.get('probability')}% confidence")
            )
        conn.close()
        return True
    except Exception as e:
        print(f"DB Error (save_transaction): {e}")
        return False


def get_transactions(limit: int = 50, fraud_only: bool = False) -> list:
    """Fetch transactions from DB."""
    sql = "SELECT * FROM transactions"
    if fraud_only:
        sql += " WHERE is_fraud = TRUE"
    sql += " ORDER BY created_at DESC LIMIT %s"
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, (limit,))
        rows = cur.fetchall()
        conn.close()
        # Convert decimals/datetime to JSON-serialisable types
        for row in rows:
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    row[k] = v.isoformat()
                elif hasattr(v, '__float__'):
                    row[k] = float(v)
        return rows
    except Exception as e:
        print(f"DB Error (get_transactions): {e}")
        return []


def get_dashboard_stats() -> dict:
    """Aggregate stats for the dashboard."""
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT COUNT(*) AS total, SUM(is_fraud) AS fraud FROM transactions")
        row = cur.fetchone()
        total = row['total'] or 0
        fraud = int(row['fraud'] or 0)

        cur.execute("""
            SELECT DATE(created_at) AS day, COUNT(*) AS count
            FROM transactions
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY day
        """)
        daily = cur.fetchall()
        for d in daily:
            d['day'] = str(d['day'])

        cur.execute("""
            SELECT type, COUNT(*) AS count
            FROM transactions GROUP BY type
        """)
        by_type = cur.fetchall()

        conn.close()
        return {
            'total': total,
            'fraudulent': fraud,
            'nonFraudulent': total - fraud,
            'accuracy': 97.3,
            'daily': daily,
            'byType': by_type
        }
    except Exception as e:
        print(f"DB Error (get_dashboard_stats): {e}")
        return {'total': 0, 'fraudulent': 0, 'nonFraudulent': 0, 'accuracy': 97.3, 'daily': [], 'byType': []}


def get_alerts(limit: int = 20) -> list:
    """Fetch fraud alerts."""
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT a.*, t.amount, t.type
            FROM fraud_alerts a
            JOIN transactions t ON a.transaction_id = t.id
            ORDER BY a.created_at DESC LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
        conn.close()
        for row in rows:
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    row[k] = v.isoformat()
                elif hasattr(v, '__float__'):
                    row[k] = float(v)
        return rows
    except Exception as e:
        print(f"DB Error (get_alerts): {e}")
        return []


# ─── User Auth ───────────────────────────────────────────────────────────────

def get_user_by_username(username: str) -> dict | None:
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        conn.close()
        return user
    except Exception as e:
        print(f"DB Error (get_user): {e}")
        return None


def update_last_login(user_id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user_id,))
        conn.close()
    except Exception as e:
        print(f"DB Error (update_last_login): {e}")
