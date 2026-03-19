-- =====================================================
-- FraudShield - Online Bank Fraud Detection System
-- MySQL Database Schema
-- =====================================================

CREATE DATABASE IF NOT EXISTS fraudshield_db;
USE fraudshield_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'analyst', 'viewer') DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(20) PRIMARY KEY,
    type ENUM('CASH_IN','CASH_OUT','DEBIT','PAYMENT','TRANSFER') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    old_balance_orig DECIMAL(15,2) NOT NULL DEFAULT 0,
    new_balance_orig DECIMAL(15,2) NOT NULL DEFAULT 0,
    old_balance_dest DECIMAL(15,2) NOT NULL DEFAULT 0,
    new_balance_dest DECIMAL(15,2) NOT NULL DEFAULT 0,
    transaction_hour TINYINT DEFAULT 12,
    location VARCHAR(100),
    is_fraud BOOLEAN NOT NULL DEFAULT FALSE,
    fraud_probability DECIMAL(5,2) DEFAULT 0.00,
    ml_model_used VARCHAR(50) DEFAULT 'Random Forest',
    analyzed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analyzed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_is_fraud (is_fraud),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type)
);

-- ML Model logs
CREATE TABLE IF NOT EXISTS model_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(50) NOT NULL,
    accuracy DECIMAL(5,2),
    precision_score DECIMAL(5,2),
    recall_score DECIMAL(5,2),
    f1_score DECIMAL(5,2),
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    training_samples INT
);

-- Fraud alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(20) NOT NULL,
    alert_level ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
    alert_message TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by INT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed default admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@fraudshield.com', '$2b$12$eKQgY3JB7JNzv5X9pPzX8uFCsv7tEkZK9mXkLvO3mNzY4wR8dT6Y2', 'admin'),
('analyst1', 'analyst@fraudshield.com', '$2b$12$eKQgY3JB7JNzv5X9pPzX8uFCsv7tEkZK9mXkLvO3mNzY4wR8dT6Y2', 'analyst');
