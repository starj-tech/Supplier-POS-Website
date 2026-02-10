<?php
// Fix Transactions Table Schema
// Upload this file to server and open in browser to fix the metode_pembayaran issue
// URL: https://dede.kantahkabbogor.id/setup/fix-transactions.php
// DELETE THIS FILE AFTER RUNNING!

header("Access-Control-Allow-Origin: *");
header("Content-Type: text/html; charset=UTF-8");

require_once '../config/database.php';

$database = new Database();
$conn = $database->getConnection();

$results = [];

// Check current columns
try {
    $stmt = $conn->query("SHOW COLUMNS FROM transactions");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results[] = ['action' => 'Check columns', 'status' => 'success', 'message' => 'Current columns: ' . implode(', ', $columns)];
} catch (PDOException $e) {
    $columns = [];
    $results[] = ['action' => 'Check columns', 'status' => 'error', 'message' => $e->getMessage()];
}

// Fix metode_pembayaran column
try {
    if (in_array('metode_pembayaran', $columns)) {
        $conn->exec("ALTER TABLE transactions MODIFY COLUMN metode_pembayaran VARCHAR(50) NOT NULL DEFAULT 'Tunai'");
        $results[] = ['action' => 'Fix metode_pembayaran', 'status' => 'success', 'message' => 'Column modified to VARCHAR(50) NOT NULL DEFAULT Tunai'];
    } else {
        $conn->exec("ALTER TABLE transactions ADD COLUMN metode_pembayaran VARCHAR(50) NOT NULL DEFAULT 'Tunai'");
        $results[] = ['action' => 'Fix metode_pembayaran', 'status' => 'success', 'message' => 'Column added'];
    }
} catch (PDOException $e) {
    $results[] = ['action' => 'Fix metode_pembayaran', 'status' => 'error', 'message' => $e->getMessage()];
}

// Fix total column
try {
    if (in_array('total', $columns)) {
        $conn->exec("ALTER TABLE transactions MODIFY COLUMN total DECIMAL(15,2) NOT NULL DEFAULT 0");
        $results[] = ['action' => 'Fix total', 'status' => 'success', 'message' => 'Column modified to DECIMAL(15,2)'];
    } else {
        $conn->exec("ALTER TABLE transactions ADD COLUMN total DECIMAL(15,2) NOT NULL DEFAULT 0");
        $results[] = ['action' => 'Fix total', 'status' => 'success', 'message' => 'Column added'];
    }
} catch (PDOException $e) {
    $results[] = ['action' => 'Fix total', 'status' => 'error', 'message' => $e->getMessage()];
}

// Fix product_id column
try {
    if (!in_array('product_id', $columns)) {
        $conn->exec("ALTER TABLE transactions ADD COLUMN product_id VARCHAR(36) DEFAULT NULL");
        $results[] = ['action' => 'Fix product_id', 'status' => 'success', 'message' => 'Column added'];
    } else {
        $results[] = ['action' => 'Fix product_id', 'status' => 'success', 'message' => 'Column already exists'];
    }
} catch (PDOException $e) {
    $results[] = ['action' => 'Fix product_id', 'status' => 'error', 'message' => $e->getMessage()];
}

// Fix tanggal column
try {
    if (!in_array('tanggal', $columns)) {
        $conn->exec("ALTER TABLE transactions ADD COLUMN tanggal DATETIME DEFAULT NULL");
        $results[] = ['action' => 'Fix tanggal', 'status' => 'success', 'message' => 'Column added'];
    } else {
        $results[] = ['action' => 'Fix tanggal', 'status' => 'success', 'message' => 'Column already exists'];
    }
} catch (PDOException $e) {
    $results[] = ['action' => 'Fix tanggal', 'status' => 'error', 'message' => $e->getMessage()];
}

// Verify final schema
try {
    $stmt = $conn->query("SHOW COLUMNS FROM transactions");
    $finalColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $results[] = ['action' => 'Verify schema', 'status' => 'success', 'message' => 'Schema verified'];
} catch (PDOException $e) {
    $finalColumns = [];
    $results[] = ['action' => 'Verify schema', 'status' => 'error', 'message' => $e->getMessage()];
}

// Test insert and read with metode_pembayaran
try {
    $testId = 'test-' . time();
    $conn->exec("INSERT INTO transactions (id, nama_produk, qty, harga, total, metode_pembayaran) VALUES ('$testId', 'TEST-DELETE-ME', 1, 1000, 1000, 'Shopee')");
    $stmt = $conn->prepare("SELECT metode_pembayaran FROM transactions WHERE id = :id");
    $stmt->execute([':id' => $testId]);
    $row = $stmt->fetch();
    $savedMethod = $row ? $row['metode_pembayaran'] : 'NOT FOUND';
    $conn->exec("DELETE FROM transactions WHERE id = '$testId'");
    $results[] = ['action' => 'Test insert Shopee', 'status' => $savedMethod === 'Shopee' ? 'success' : 'error', 'message' => "Saved value: $savedMethod (expected: Shopee)"];
} catch (PDOException $e) {
    $results[] = ['action' => 'Test insert Shopee', 'status' => 'error', 'message' => $e->getMessage()];
}

$allSuccess = !array_filter($results, fn($r) => $r['status'] === 'error');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fix Transactions Table</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #fff; padding: 20px; margin: 0; min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; }
        .item { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin: 8px 0; border-radius: 8px; background: rgba(255,255,255,0.05); }
        .item.success { border-left: 4px solid #00ff88; }
        .item.error { border-left: 4px solid #ff4444; }
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .badge.success { background: #00ff88; color: #000; }
        .badge.error { background: #ff4444; color: #fff; }
        .summary { text-align: center; padding: 20px; border-radius: 12px; margin-top: 20px; }
        .summary.ok { background: rgba(0,255,136,0.2); border: 2px solid #00ff88; }
        .summary.fail { background: rgba(255,68,68,0.2); border: 2px solid #ff4444; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { color: #00ff88; }
        .warn { color: #ffaa00; margin-top: 20px; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <h1>🔧 Fix Transactions Table</h1>

    <?php foreach ($results as $r): ?>
    <div class="item <?= $r['status'] ?>">
        <div><strong><?= htmlspecialchars($r['action']) ?></strong><br><small><?= htmlspecialchars($r['message']) ?></small></div>
        <span class="badge <?= $r['status'] ?>"><?= strtoupper($r['status']) ?></span>
    </div>
    <?php endforeach; ?>

    <?php if (!empty($finalColumns)): ?>
    <h2>📋 Final Schema</h2>
    <table>
        <tr><th>Column</th><th>Type</th><th>Null</th><th>Default</th></tr>
        <?php foreach ($finalColumns as $col): ?>
        <tr>
            <td><?= $col['Field'] ?></td>
            <td><?= $col['Type'] ?></td>
            <td><?= $col['Null'] ?></td>
            <td><?= $col['Default'] ?? 'NULL' ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php endif; ?>

    <div class="summary <?= $allSuccess ? 'ok' : 'fail' ?>">
        <?php if ($allSuccess): ?>
            <h2>✅ Semua perbaikan berhasil!</h2>
            <p>Metode pembayaran (Shopee/Tokopedia/Tunai) sekarang akan tersimpan dengan benar.</p>
        <?php else: ?>
            <h2>⚠️ Ada error</h2>
            <p>Periksa detail di atas.</p>
        <?php endif; ?>
    </div>

    <p class="warn">⚠️ <strong>HAPUS FILE INI SETELAH SELESAI!</strong></p>
</div>
</body>
</html>
