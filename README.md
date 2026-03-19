# 🛡️ FraudShield — Online Bank Fraud Detection System


> An intelligent web-based fraud detection system using Machine Learning (Random Forest + Logistic Regression), Flask REST API, React.js frontend, and MySQL database.

---

## 📁 Project Structure

```
fraudshield_project/
├── backend/
│   ├── app.py                  ← Flask REST API (main entry)
│   ├── database.py             ← MySQL connection + queries
│   ├── requirements.txt        ← Python dependencies
│   ├── .env.example            ← Environment variables template
│   └── ml/
│       ├── train_model.py      ← Train RF + LR models
│       └── predictor.py        ← Load models + predict
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             ← Routes + auth guard
│       ├── index.css           ← Global styles + Tailwind
│       ├── hooks/
│       │   └── useAuth.jsx     ← Auth context + JWT
│       ├── utils/
│       │   └── api.js          ← Axios with auto-token
│       ├── components/
│       │   └── AppLayout.jsx   ← Sidebar + nav
│       └── pages/
│           ├── Login.jsx       ← Login page
│           ├── Dashboard.jsx   ← Stats + charts
│           ├── Analyze.jsx     ← Fraud detection form
│           ├── History.jsx     ← Transaction table
│           └── Alerts.jsx      ← Fraud alert feed
│
└── database/
    └── schema.sql              ← MySQL schema + seed data
```

---

## ⚙️ Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | React.js, Vite, Tailwind CSS           |
| Charts      | Recharts                               |
| Backend     | Flask (Python), Flask-JWT-Extended     |
| ML Models   | Scikit-learn (Random Forest + LR)      |
| Database    | MySQL 8.x                              |
| Auth        | JWT (JSON Web Tokens) + bcrypt         |

---

## 🚀 Setup Instructions

### 1. MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Run schema
source database/schema.sql
# OR
mysql -u root -p < database/schema.sql
```

### 2. Backend (Flask)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set your DB_PASSWORD and secret keys

# Train ML models (required before starting server)
python ml/train_model.py

# Start Flask server
python app.py
# Server runs at http://localhost:5000
```

### 3. Frontend (React)

```bash
cd frontend

# Install packages
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build
```

---

## 🔐 Demo Login

| Role    | Username  | Password  |
|---------|-----------|-----------|
| Admin   | admin     | admin123  |
| Analyst | analyst1  | admin123  |

---

## 🧠 ML Models

### Features Used (16 total)
- Transaction type, amount, hour
- Sender/receiver balance (before & after)
- Derived: balance discrepancy, account drained, dest. unchanged, night flag, large-amount flag

### Algorithms
| Model               | Typical Accuracy |
|---------------------|-----------------|
| Random Forest       | ~96–98%         |
| Logistic Regression | ~90–94%         |
| Ensemble (default)  | ~97%+           |

---

## 🌐 API Endpoints

| Method | Endpoint               | Description                   | Auth |
|--------|------------------------|-------------------------------|------|
| POST   | `/api/auth/login`      | Login, returns JWT token      | No   |
| GET    | `/api/auth/me`         | Get current user              | Yes  |
| POST   | `/api/analyze`         | Predict fraud for transaction | Yes  |
| GET    | `/api/transactions`    | List all transactions         | Yes  |
| POST   | `/api/transactions`    | Save analyzed transaction     | Yes  |
| GET    | `/api/dashboard`       | Dashboard stats               | Yes  |
| GET    | `/api/alerts`          | Fraud alerts                  | Yes  |
| GET    | `/api/model/info`      | Model accuracy info           | Yes  |
| GET    | `/api/health`          | Health check                  | No   |

---

## 📊 Sample Analyze Request

```json
POST /api/analyze
Authorization: Bearer <token>

{
  "type": "TRANSFER",
  "amount": 250000,
  "oldBalanceOrig": 250000,
  "newBalanceOrig": 0,
  "oldBalanceDest": 0,
  "newBalanceDest": 0,
  "hour": 3,
  "model": "auto"
}
```

**Response:**
```json
{
  "isFraud": true,
  "probability": 91.4,
  "model": "Ensemble (RF 97.2% + LR 92.1%)",
  "riskLevel": "CRITICAL",
  "features": [
    { "name": "Account Drained", "importance": 0.35 },
    { "name": "Transaction Amount", "importance": 0.28 }
  ]
}
```

---



---

