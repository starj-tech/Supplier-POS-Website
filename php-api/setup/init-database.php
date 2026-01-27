<?php
// Database Initialization Script
// Access this file via browser to create all required tables
// URL: https://dede.kantahkabbogor.id/api/setup/init-database.php

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/html; charset=UTF-8");

require_once '../config/database.php';

$database = new Database();
$conn = $database->getConnection();

$results = [];

// Create users table
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(191) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $results[] = ['table' => 'users', 'status' => 'success', 'message' => 'Created or already exists'];
} catch (PDOException $e) {
    $results[] = ['table' => 'users', 'status' => 'error', 'message' => $e->getMessage()];
}

// Create user_tokens table
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS user_tokens (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $results[] = ['table' => 'user_tokens', 'status' => 'success', 'message' => 'Created or already exists'];
} catch (PDOException $e) {
    $results[] = ['table' => 'user_tokens', 'status' => 'error', 'message' => $e->getMessage()];
}

// Create products table
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(36) PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            harga DECIMAL(15, 2) NOT NULL DEFAULT 0,
            stok INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $results[] = ['table' => 'products', 'status' => 'success', 'message' => 'Created or already exists'];
} catch (PDOException $e) {
    $results[] = ['table' => 'products', 'status' => 'error', 'message' => $e->getMessage()];
}

// Create transactions table
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(36) PRIMARY KEY,
            nama_produk VARCHAR(255) NOT NULL,
            qty INT NOT NULL DEFAULT 1,
            harga DECIMAL(15, 2) NOT NULL DEFAULT 0,
            total DECIMAL(15, 2) NOT NULL DEFAULT 0,
            metode_pembayaran VARCHAR(50) NOT NULL DEFAULT 'Tunai',
            product_id VARCHAR(36) DEFAULT NULL,
            tanggal DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $results[] = ['table' => 'transactions', 'status' => 'success', 'message' => 'Created or already exists'];
} catch (PDOException $e) {
    $results[] = ['table' => 'transactions', 'status' => 'error', 'message' => $e->getMessage()];
}

// Create other_expenses table
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS other_expenses (
            id VARCHAR(36) PRIMARY KEY,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
            date DATE NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $results[] = ['table' => 'other_expenses', 'status' => 'success', 'message' => 'Created or already exists'];
} catch (PDOException $e) {
    $results[] = ['table' => 'other_expenses', 'status' => 'error', 'message' => $e->getMessage()];
}

// Create store_settings table
try {
    $conn->exec("
        CREATE TABLE IF NOT EXISTS store_settings (
            id INT PRIMARY KEY DEFAULT 1,
            store_name VARCHAR(255) DEFAULT 'Distributor & Supplier Kertas',
            store_logo LONGTEXT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $results[] = ['table' => 'store_settings', 'status' => 'success', 'message' => 'Created or already exists'];
    
    // Insert default settings if not exists
    $conn->exec("INSERT IGNORE INTO store_settings (id, store_name) VALUES (1, 'Distributor & Supplier Kertas')");
} catch (PDOException $e) {
    $results[] = ['table' => 'store_settings', 'status' => 'error', 'message' => $e->getMessage()];
}

// Create indexes
try {
    $conn->exec("CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON transactions(tanggal)");
} catch (PDOException $e) {
    // Index mungkin sudah ada, abaikan
}

try {
    $conn->exec("CREATE INDEX IF NOT EXISTS idx_other_expenses_date ON other_expenses(date)");
} catch (PDOException $e) {
    // Index mungkin sudah ada, abaikan
}

try {
    $conn->exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
} catch (PDOException $e) {
    // Index mungkin sudah ada, abaikan
}

try {
    $conn->exec("CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token)");
} catch (PDOException $e) {
    // Index mungkin sudah ada, abaikan
}

// Display results
$allSuccess = true;
foreach ($results as $result) {
    if ($result['status'] === 'error') {
        $allSuccess = false;
        break;
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Setup - POS System</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        .status-box {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin: 8px 0;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
        }
        .status-success {
            border-left: 4px solid #00ff88;
        }
        .status-error {
            border-left: 4px solid #ff4444;
        }
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        .badge-success {
            background: #00ff88;
            color: #000;
        }
        .badge-error {
            background: #ff4444;
            color: #fff;
        }
        .summary {
            text-align: center;
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
        }
        .summary-success {
            background: rgba(0, 255, 136, 0.2);
            border: 2px solid #00ff88;
        }
        .summary-error {
            background: rgba(255, 68, 68, 0.2);
            border: 2px solid #ff4444;
        }
        .next-steps {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }
        .next-steps h3 {
            margin-top: 0;
        }
        .next-steps ol {
            padding-left: 20px;
        }
        .next-steps li {
            margin: 10px 0;
        }
        code {
            background: rgba(0,0,0,0.3);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
        }
        a {
            color: #00ff88;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ Database Setup - POS System</h1>
        
        <div class="status-box">
            <h2>📋 Table Creation Results</h2>
            <?php foreach ($results as $result): ?>
                <div class="status-item status-<?php echo $result['status']; ?>">
                    <div>
                        <strong><?php echo htmlspecialchars($result['table']); ?></strong>
                        <br>
                        <small><?php echo htmlspecialchars($result['message']); ?></small>
                    </div>
                    <span class="badge badge-<?php echo $result['status']; ?>">
                        <?php echo strtoupper($result['status']); ?>
                    </span>
                </div>
            <?php endforeach; ?>
        </div>
        
        <div class="summary summary-<?php echo $allSuccess ? 'success' : 'error'; ?>">
            <?php if ($allSuccess): ?>
                <h2>✅ Database Setup Complete!</h2>
                <p>Semua tabel berhasil dibuat. Anda sekarang bisa menggunakan aplikasi POS.</p>
            <?php else: ?>
                <h2>⚠️ Some Tables Failed</h2>
                <p>Beberapa tabel gagal dibuat. Periksa error message di atas.</p>
            <?php endif; ?>
        </div>
        
        <?php if ($allSuccess): ?>
        <div class="next-steps">
            <h3>🚀 Langkah Selanjutnya:</h3>
            <ol>
                <li>Buka aplikasi POS: <a href="https://paperdistributor.lovable.app" target="_blank">https://paperdistributor.lovable.app</a></li>
                <li>Daftar dengan email: <code>abdurrohmanmuthi@gmail.com</code></li>
                <li>Login dan mulai menggunakan sistem POS</li>
            </ol>
            <p><strong>⚠️ Penting:</strong> Hapus file ini setelah setup selesai untuk keamanan!</p>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
