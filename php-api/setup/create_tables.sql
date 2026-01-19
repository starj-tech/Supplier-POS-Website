-- Database setup for POS System
-- Run this SQL in phpMyAdmin or MySQL client

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    harga DECIMAL(15, 2) NOT NULL DEFAULT 0,
    stok INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    nama_produk VARCHAR(255) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    harga DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    metode_pembayaran ENUM('cash', 'transfer', 'qris') NOT NULL DEFAULT 'cash',
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Other expenses table
CREATE TABLE IF NOT EXISTS other_expenses (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Store settings table
CREATE TABLE IF NOT EXISTS store_settings (
    id INT PRIMARY KEY DEFAULT 1,
    store_name VARCHAR(255) NOT NULL DEFAULT 'Toko Saya',
    store_logo TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default store settings
INSERT IGNORE INTO store_settings (id, store_name) VALUES (1, 'Paper Distributor');

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User tokens table for authentication (JWT-like token storage)
CREATE TABLE IF NOT EXISTS user_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for better performance
CREATE INDEX idx_transactions_tanggal ON transactions(tanggal);
CREATE INDEX idx_other_expenses_date ON other_expenses(date);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_tokens_token ON user_tokens(token);
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_expires_at ON user_tokens(expires_at);

-- Optional: Clean up expired tokens (run periodically)
-- DELETE FROM user_tokens WHERE expires_at < NOW();
