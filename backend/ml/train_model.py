# """
# FraudShield - ML Model Training
# Trains Random Forest and Logistic Regression on synthetic PaySim-like data.
# Run: python train_model.py
# """

# import numpy as np
# import pandas as pd
# from sklearn.ensemble import RandomForestClassifier
# from sklearn.linear_model import LogisticRegression
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import classification_report, accuracy_score
# from sklearn.preprocessing import LabelEncoder, StandardScaler
# import pickle
# import os

# np.random.seed(42)

# def generate_synthetic_data(n=5000):
#     """Generate synthetic transaction data mimicking Kaggle PaySim dataset."""
#     types = ['CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER']
    
#     data = []
#     for _ in range(n):
#         txn_type = np.random.choice(types, p=[0.3, 0.2, 0.15, 0.2, 0.15])
#         amount = np.random.exponential(50000)
#         old_bal_orig = np.random.uniform(0, 1000000)
#         hour = np.random.randint(0, 24)

#         # Fraud pattern logic
#         is_fraud = 0
#         fraud_score = 0

#         if txn_type in ['TRANSFER', 'CASH_OUT']:
#             fraud_score += 0.2
#         if amount > 200000:
#             fraud_score += 0.3
#         if hour < 5 or hour > 22:
#             fraud_score += 0.15
#         if old_bal_orig < amount * 0.1:
#             fraud_score += 0.2

#         if fraud_score + np.random.uniform(-0.1, 0.1) > 0.45:
#             is_fraud = 1
#             new_bal_orig = 0
#             old_bal_dest = np.random.uniform(0, 500000)
#             new_bal_dest = old_bal_dest  # destination unchanged (fraud indicator)
#         else:
#             new_bal_orig = max(0, old_bal_orig - amount)
#             old_bal_dest = np.random.uniform(0, 500000)
#             new_bal_dest = old_bal_dest + amount

#         data.append({
#             'type': txn_type,
#             'amount': round(amount, 2),
#             'oldBalanceOrig': round(old_bal_orig, 2),
#             'newBalanceOrig': round(new_bal_orig, 2),
#             'oldBalanceDest': round(old_bal_dest, 2),
#             'newBalanceDest': round(new_bal_dest, 2),
#             'hour': hour,
#             'isFraud': is_fraud
#         })

#     return pd.DataFrame(data)


# def feature_engineer(df):
#     """Create engineered features."""
#     df = df.copy()

#     # Type encoding
#     le = LabelEncoder()
#     df['type_encoded'] = le.fit_transform(df['type'])

#     # Derived features
#     df['balance_diff_orig'] = df['oldBalanceOrig'] - df['newBalanceOrig']
#     df['balance_diff_dest'] = df['newBalanceDest'] - df['oldBalanceDest']
#     df['amount_to_orig_ratio'] = df['amount'] / (df['oldBalanceOrig'] + 1)
#     df['orig_drained'] = (df['newBalanceOrig'] == 0).astype(int)
#     df['dest_unchanged'] = (df['oldBalanceDest'] == df['newBalanceDest']).astype(int)
#     df['error_balance_orig'] = df['oldBalanceOrig'] - df['newBalanceOrig'] - df['amount']
#     df['error_balance_dest'] = df['oldBalanceDest'] + df['amount'] - df['newBalanceDest']
#     df['is_night'] = ((df['hour'] <= 5) | (df['hour'] >= 22)).astype(int)
#     df['is_large'] = (df['amount'] > 200000).astype(int)

#     return df, le


# def train():
#     print("🚀 Generating training data...")
#     df = generate_synthetic_data(n=6000)

#     print(f"   Total samples: {len(df)}")
#     print(f"   Fraud: {df['isFraud'].sum()} ({df['isFraud'].mean()*100:.1f}%)")
#     print(f"   Normal: {(df['isFraud'] == 0).sum()}")

#     # Feature engineering
#     df, le = feature_engineer(df)

#     FEATURES = [
#         'type_encoded', 'amount', 'oldBalanceOrig', 'newBalanceOrig',
#         'oldBalanceDest', 'newBalanceDest', 'hour',
#         'balance_diff_orig', 'balance_diff_dest', 'amount_to_orig_ratio',
#         'orig_drained', 'dest_unchanged', 'error_balance_orig',
#         'error_balance_dest', 'is_night', 'is_large'
#     ]

#     X = df[FEATURES]
#     y = df['isFraud']

#     X_train, X_test, y_train, y_test = train_test_split(
#         X, y, test_size=0.2, random_state=42, stratify=y
#     )

#     scaler = StandardScaler()
#     X_train_sc = scaler.fit_transform(X_train)
#     X_test_sc = scaler.transform(X_test)

#     # --- Random Forest ---
#     print("\n🌲 Training Random Forest...")
#     rf = RandomForestClassifier(
#         n_estimators=100, max_depth=12, min_samples_split=5,
#         class_weight='balanced', random_state=42, n_jobs=-1
#     )
#     rf.fit(X_train, y_train)
#     rf_preds = rf.predict(X_test)
#     rf_acc = accuracy_score(y_test, rf_preds)
#     print(f"   Accuracy: {rf_acc*100:.2f}%")
#     print(classification_report(y_test, rf_preds))

#     # --- Logistic Regression ---
#     print("\n📈 Training Logistic Regression...")
#     lr = LogisticRegression(
#         max_iter=1000, class_weight='balanced', C=0.5, random_state=42
#     )
#     lr.fit(X_train_sc, y_train)
#     lr_preds = lr.predict(X_test_sc)
#     lr_acc = accuracy_score(y_test, lr_preds)
#     print(f"   Accuracy: {lr_acc*100:.2f}%")
#     print(classification_report(y_test, lr_preds))

#     # Save models
#     os.makedirs('models', exist_ok=True)
#     model_bundle = {
#         'random_forest': rf,
#         'logistic_regression': lr,
#         'scaler': scaler,
#         'label_encoder': le,
#         'features': FEATURES,
#         'rf_accuracy': round(rf_acc * 100, 2),
#         'lr_accuracy': round(lr_acc * 100, 2),
#     }
#     with open('models/fraud_models.pkl', 'wb') as f:
#         pickle.dump(model_bundle, f)

#     print("\n✅ Models saved to models/fraud_models.pkl")
#     return model_bundle


# if __name__ == '__main__':
#     train()

import pandas as pd
import numpy as np
import plotly.express as px
import torch
import torch.nn as nn
import torch.optim as optim
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

data = pd.read_csv("onlinefraud (7).csv")

print("Dataset Preview\n")
print(data.head())

print("\nDataset Shape:", data.shape)

print("\nMissing Values")
print(data.isnull().sum())

type_counts = data["type"].value_counts()

transactions = type_counts.index
quantity = type_counts.values

fig = px.pie(
    values=quantity,
    names=transactions,
    hole=0.5,
    title="Transaction Type Distribution"
)

fig.show()

fraud_counts = data["isFraud"].value_counts()

fig = px.bar(
    x=fraud_counts.index,
    y=fraud_counts.values,
    labels={"x": "Fraud", "y": "Count"},
    title="Fraud vs Non Fraud Transactions"
)

fig.show()

data["type"] = data["type"].map({
    "CASH_OUT":1,
    "PAYMENT":2,
    "CASH_IN":3,
    "TRANSFER":4,
    "DEBIT":5
})

data["balance_diff"] = data["oldbalanceOrg"] - data["newbalanceOrig"]

data = data.dropna()

features = [
"type",
"amount",
"oldbalanceOrg",
"newbalanceOrig",
"oldbalanceDest",
"newbalanceDest",
"balance_diff"
]

X = data[features]
y = data["isFraud"]

scaler = StandardScaler()
X = scaler.fit_transform(X)

xtrain, xtest, ytrain, ytest = train_test_split(
X, y, test_size=0.2, random_state=42
)

xtrain = torch.tensor(xtrain, dtype=torch.float32)
xtest = torch.tensor(xtest, dtype=torch.float32)

ytrain = torch.tensor(ytrain.values, dtype=torch.float32).view(-1,1)
ytest = torch.tensor(ytest.values, dtype=torch.float32).view(-1,1)

class FraudNet(nn.Module):
    def __init__(self):
        super(FraudNet, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(7,64),
            nn.ReLU(),
            nn.Linear(64,32),
            nn.ReLU(),
            nn.Linear(32,16),
            nn.ReLU(),
            nn.Linear(16,1),
            nn.Sigmoid()
        )

    def forward(self,x):
        return self.net(x)

model = FraudNet()

criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

epochs = 5
batch_size = 1024

for epoch in range(epochs):

    permutation = torch.randperm(xtrain.size()[0])

    for i in range(0, xtrain.size()[0], batch_size):

        indices = permutation[i:i+batch_size]
        batch_x = xtrain[indices]
        batch_y = ytrain[indices]

        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    print(f"Epoch {epoch+1}/{epochs} Loss: {loss.item()}")

with torch.no_grad():

    preds = model(xtest)
    preds = (preds > 0.5).float()

y_true = ytest.numpy()
y_pred = preds.numpy()

accuracy = accuracy_score(y_true, y_pred)

print("\nAccuracy:", accuracy)

print("\nClassification Report")
print(classification_report(y_true, y_pred))

print("\nConfusion Matrix")
print(confusion_matrix(y_true, y_pred))

torch.save(model.state_dict(), "fraud_detection_model.pth")

joblib.dump(scaler, "fraud_scaler.pkl")

sample = torch.tensor([[1,8900.2,8990.2,0.0,0.0,0.0,8990.2]], dtype=torch.float32)

with torch.no_grad():
    prediction = model(sample)
    prediction = (prediction > 0.5).float()

print("\nSample Transaction Prediction:", prediction.item())

if prediction.item() == 1:
    print("Fraudulent Transaction")
else:
    print("Legitimate Transaction")