"""
FraudShield - Flask Backend
Main application entry point.
Run: python app.py
"""

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
import random
import string
from datetime import timedelta
import os

from database import (
    save_transaction, get_transactions, get_dashboard_stats,
    get_alerts, get_user_by_username, update_last_login
)
from ml.predictor import predict, get_model_info

# ─── App Setup ───────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fraudshield-secret-2024')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-fraudshield-2024')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000"]}})
jwt = JWTManager(app)


def gen_txn_id():
    return 'TXN' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


# ─── Auth Routes ─────────────────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = get_user_by_username(username)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Invalid credentials'}), 401

    update_last_login(user['id'])
    token = create_access_token(identity={'id': user['id'], 'username': user['username'], 'role': user['role']})

    return jsonify({
        'token': token,
        'user': {'id': user['id'], 'username': user['username'], 'role': user['role']}
    })


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    return jsonify(get_jwt_identity())


# ─── Transaction Routes ───────────────────────────────────────────────────────

@app.route('/api/analyze', methods=['POST'])
@jwt_required()
def analyze():
    """Analyze a transaction for fraud."""
    data = request.get_json()
    required = ['type', 'amount']
    for f in required:
        if f not in data:
            return jsonify({'error': f'Missing field: {f}'}), 400

    try:
        model_choice = data.pop('model', 'auto')
        result = predict(data, model_choice=model_choice)
        return jsonify(result)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/api/transactions', methods=['GET'])
@jwt_required()
def list_transactions():
    limit = int(request.args.get('limit', 50))
    fraud_only = request.args.get('fraud_only', 'false').lower() == 'true'
    rows = get_transactions(limit=limit, fraud_only=fraud_only)
    return jsonify(rows)


@app.route('/api/transactions', methods=['POST'])
@jwt_required()
def create_transaction():
    """Save a transaction (after analyze)."""
    data = request.get_json()
    identity = get_jwt_identity()

    if 'id' not in data:
        data['id'] = gen_txn_id()

    success = save_transaction(data, user_id=identity['id'])
    if success:
        return jsonify({'message': 'Saved', 'id': data['id']}), 201
    return jsonify({'error': 'Failed to save'}), 500


# ─── Dashboard Route ──────────────────────────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    stats = get_dashboard_stats()
    return jsonify(stats)


# ─── Alerts Route ─────────────────────────────────────────────────────────────

@app.route('/api/alerts', methods=['GET'])
@jwt_required()
def alerts():
    limit = int(request.args.get('limit', 20))
    return jsonify(get_alerts(limit=limit))


# ─── Model Info ───────────────────────────────────────────────────────────────

@app.route('/api/model/info', methods=['GET'])
@jwt_required()
def model_info():
    try:
        return jsonify(get_model_info())
    except Exception as e:
        return jsonify({'error': str(e)}), 503


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'FraudShield API'})


# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

