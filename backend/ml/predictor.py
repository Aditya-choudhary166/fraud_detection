# """
# FraudShield - ML Predictor
# Loads trained models and exposes prediction functions.
# """

# import pickle
# import numpy as np
# import os

# _model_bundle = None


# def _load_models():
#     global _model_bundle
#     if _model_bundle is None:
#         model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'fraud_models.pkl')
#         if not os.path.exists(model_path):
#             raise FileNotFoundError(
#                 "Models not found. Run: cd backend && python ml/train_model.py"
#             )
#         with open(model_path, 'rb') as f:
#             _model_bundle = pickle.load(f)
#     return _model_bundle


# def _build_features(data: dict) -> list:
#     """Convert transaction dict to feature vector."""
#     bundle = _load_models()
#     le = bundle['label_encoder']

#     try:
#         type_encoded = le.transform([data['type']])[0]
#     except ValueError:
#         type_encoded = 2  # fallback

#     amount = float(data.get('amount', 0))
#     old_bal_orig = float(data.get('oldBalanceOrig', 0))
#     new_bal_orig = float(data.get('newBalanceOrig', 0))
#     old_bal_dest = float(data.get('oldBalanceDest', 0))
#     new_bal_dest = float(data.get('newBalanceDest', 0))
#     hour = int(data.get('hour', 12))

#     balance_diff_orig = old_bal_orig - new_bal_orig
#     balance_diff_dest = new_bal_dest - old_bal_dest
#     amount_to_orig_ratio = amount / (old_bal_orig + 1)
#     orig_drained = int(new_bal_orig == 0)
#     dest_unchanged = int(old_bal_dest == new_bal_dest)
#     error_balance_orig = old_bal_orig - new_bal_orig - amount
#     error_balance_dest = old_bal_dest + amount - new_bal_dest
#     is_night = int(hour <= 5 or hour >= 22)
#     is_large = int(amount > 200000)

#     return [
#         type_encoded, amount, old_bal_orig, new_bal_orig,
#         old_bal_dest, new_bal_dest, hour,
#         balance_diff_orig, balance_diff_dest, amount_to_orig_ratio,
#         orig_drained, dest_unchanged, error_balance_orig,
#         error_balance_dest, is_night, is_large
#     ]


# def predict(data: dict, model_choice: str = 'auto') -> dict:
#     """
#     Predict fraud for a transaction.

#     Args:
#         data: dict with keys: type, amount, oldBalanceOrig, newBalanceOrig,
#                               oldBalanceDest, newBalanceDest, hour
#         model_choice: 'random_forest', 'logistic_regression', or 'auto' (ensemble)

#     Returns:
#         dict with keys: isFraud, probability, model, features
#     """
#     bundle = _load_models()
#     features = _build_features(data)
#     X = np.array(features).reshape(1, -1)
#     X_sc = bundle['scaler'].transform(X)

#     rf = bundle['random_forest']
#     lr = bundle['logistic_regression']

#     rf_prob = rf.predict_proba(X)[0][1]
#     lr_prob = lr.predict_proba(X_sc)[0][1]

#     if model_choice == 'random_forest':
#         prob = rf_prob
#         model_name = 'Random Forest'
#     elif model_choice == 'logistic_regression':
#         prob = lr_prob
#         model_name = 'Logistic Regression'
#     else:  # auto / ensemble
#         prob = (rf_prob * 0.65 + lr_prob * 0.35)  # weighted ensemble
#         model_name = f"Ensemble (RF {bundle['rf_accuracy']}% + LR {bundle['lr_accuracy']}%)"

#     # Feature importances from RF
#     rf_importances = rf.feature_importances_
#     feature_names = bundle['features']
#     top_features = sorted(
#         zip(feature_names, rf_importances),
#         key=lambda x: x[1], reverse=True
#     )[:5]

#     readable = {
#         'type_encoded': 'Transaction Type',
#         'amount': 'Amount',
#         'balance_diff_orig': 'Balance Drop (Sender)',
#         'balance_diff_dest': 'Balance Gain (Receiver)',
#         'orig_drained': 'Account Drained',
#         'dest_unchanged': 'Dest. Unchanged',
#         'error_balance_orig': 'Balance Error (Orig)',
#         'error_balance_dest': 'Balance Error (Dest)',
#         'is_night': 'Night Transaction',
#         'is_large': 'Large Amount',
#         'amount_to_orig_ratio': 'Amount/Balance Ratio',
#         'hour': 'Transaction Hour',
#         'oldBalanceOrig': 'Sender Old Balance',
#         'newBalanceOrig': 'Sender New Balance',
#         'oldBalanceDest': 'Receiver Old Balance',
#         'newBalanceDest': 'Receiver New Balance',
#     }

#     feature_list = [
#         {
#             'name': readable.get(n, n),
#             'importance': round(float(i), 4)
#         }
#         for n, i in top_features
#     ]

#     prob_pct = round(prob * 100, 1)
#     is_fraud = prob > 0.5

#     return {
#         'isFraud': is_fraud,
#         'probability': prob_pct,
#         'model': model_name,
#         'rf_probability': round(rf_prob * 100, 1),
#         'lr_probability': round(lr_prob * 100, 1),
#         'features': feature_list,
#         'riskLevel': 'CRITICAL' if prob > 0.85 else 'HIGH' if prob > 0.65 else 'MEDIUM' if prob > 0.35 else 'LOW'
#     }


# def get_model_info() -> dict:
#     bundle = _load_models()
#     return {
#         'rf_accuracy': bundle['rf_accuracy'],
#         'lr_accuracy': bundle['lr_accuracy'],
#         'features_count': len(bundle['features'])
#     }

"""
FraudShield - ML Predictor (PyTorch Version)
Loads FraudNet model and scaler, exposes predict() function.
"""

import torch
import torch.nn as nn
import joblib
import numpy as np
import os

# ─── Type Mapping (same as train_model.py) ───────────────────────────────────
TYPE_MAP = {
    'CASH_OUT': 1,
    'PAYMENT':  2,
    'CASH_IN':  3,
    'TRANSFER': 4,
    'DEBIT':    5,
}

FEATURES = [
    'type', 'amount', 'oldbalanceOrg', 'newbalanceOrig',
    'oldbalanceDest', 'newbalanceDest', 'balance_diff'
]


# ─── FraudNet Architecture (same as train_model.py) ──────────────────────────
class FraudNet(nn.Module):
    def __init__(self):
        super(FraudNet, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(7, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)


# ─── Model Loading ────────────────────────────────────────────────────────────
_model = None
_scaler = None


def _load_models():
    global _model, _scaler

    base = os.path.dirname(__file__)
    model_path  = os.path.join(base, '..', 'fraud_detection_model.pth')
    scaler_path = os.path.join(base, '..', 'fraud_scaler.pkl')

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            "Model not found! Pehle train_model.py run karo: python ml/train_model.py"
        )
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(
            "Scaler not found! Pehle train_model.py run karo: python ml/train_model.py"
        )

    if _model is None:
        m = FraudNet()
        m.load_state_dict(torch.load(model_path, map_location='cpu'))
        m.eval()
        _model = m

    if _scaler is None:
        _scaler = joblib.load(scaler_path)

    return _model, _scaler


# ─── Feature Builder ──────────────────────────────────────────────────────────
def _build_features(data: dict) -> np.ndarray:
    """Convert transaction dict → scaled feature vector."""
    _, scaler = _load_models()

    type_encoded   = TYPE_MAP.get(data.get('type', 'PAYMENT'), 2)
    amount         = float(data.get('amount', 0))
    old_bal_orig   = float(data.get('oldBalanceOrig',  data.get('oldbalanceOrg',  0)))
    new_bal_orig   = float(data.get('newBalanceOrig',  data.get('newbalanceOrig', 0)))
    old_bal_dest   = float(data.get('oldBalanceDest',  data.get('oldbalanceDest', 0)))
    new_bal_dest   = float(data.get('newBalanceDest',  data.get('newbalanceDest', 0)))
    balance_diff   = old_bal_orig - new_bal_orig

    raw = np.array([[
        type_encoded, amount, old_bal_orig, new_bal_orig,
        old_bal_dest, new_bal_dest, balance_diff
    ]], dtype=np.float32)

    return scaler.transform(raw)


# ─── Predict ──────────────────────────────────────────────────────────────────
def predict(data: dict, model_choice: str = 'auto') -> dict:
    """
    Predict fraud for a transaction.

    Args:
        data: dict with keys: type, amount, oldBalanceOrig, newBalanceOrig,
                              oldBalanceDest, newBalanceDest, hour (optional)
        model_choice: ignored (kept for API compatibility)

    Returns:
        dict with: isFraud, probability, model, riskLevel, features
    """
    model, _ = _load_models()

    X_scaled = _build_features(data)
    X_tensor = torch.tensor(X_scaled, dtype=torch.float32)

    with torch.no_grad():
        output = model(X_tensor)
        prob   = output.item()

    is_fraud  = prob > 0.5
    prob_pct  = round(prob * 100, 1)
    risk_level = (
        'CRITICAL' if prob > 0.85 else
        'HIGH'     if prob > 0.65 else
        'MEDIUM'   if prob > 0.35 else
        'LOW'
    )

    # Feature importance (rule-based explanation since neural net)
    amount       = float(data.get('amount', 0))
    old_bal_orig = float(data.get('oldBalanceOrig', data.get('oldbalanceOrg', 0)))
    new_bal_orig = float(data.get('newBalanceOrig', data.get('newbalanceOrig', 0)))
    old_bal_dest = float(data.get('oldBalanceDest', data.get('oldbalanceDest', 0)))
    new_bal_dest = float(data.get('newBalanceDest', data.get('newbalanceDest', 0)))
    txn_type     = data.get('type', 'PAYMENT')
    hour         = int(data.get('hour', 12))
    bal_diff     = old_bal_orig - new_bal_orig

    feature_list = sorted([
        {'name': 'Transaction Amount',      'importance': min(1.0, amount / 500000)},
        {'name': 'Balance Discrepancy',     'importance': min(1.0, abs(bal_diff - amount) / 100000)},
        {'name': 'Transaction Type',        'importance': 0.75 if txn_type in ['TRANSFER', 'CASH_OUT'] else 0.2},
        {'name': 'Account Drained',         'importance': 0.9  if new_bal_orig == 0 and old_bal_orig > 0 else 0.1},
        {'name': 'Destination Unchanged',   'importance': 0.8  if old_bal_dest == new_bal_dest and amount > 10000 else 0.1},
        {'name': 'Night Transaction',       'importance': 0.6  if hour <= 5 or hour >= 22 else 0.1},
    ], key=lambda x: x['importance'], reverse=True)[:5]

    # Normalise importances to 0-1
    max_imp = max(f['importance'] for f in feature_list) or 1
    for f in feature_list:
        f['importance'] = round(f['importance'] / max_imp, 4)

    return {
        'isFraud':        is_fraud,
        'probability':    prob_pct,
        'model':          'FraudNet (Deep Neural Network)',
        'riskLevel':      risk_level,
        'features':       feature_list,
        'rf_probability': prob_pct,   # kept for UI compatibility
        'lr_probability': prob_pct,
    }


def get_model_info() -> dict:
    _load_models()
    return {
        'model_type':     'PyTorch Neural Network (FraudNet)',
        'architecture':   '7 → 64 → 32 → 16 → 1',
        'features_count': len(FEATURES),
        'rf_accuracy':    'N/A',
        'lr_accuracy':    'N/A',
    }