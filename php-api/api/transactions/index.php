<?php
// CORS must be first - before any other code
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';

$database = new Database();
$conn = $database->getConnection();

// Validate token for all requests
$currentUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getTransactions($conn);
        break;
    case 'POST':
        createTransaction($conn);
        break;
    case 'PUT':
        updateTransaction($conn);
        break;
    case 'DELETE':
        deleteTransaction($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

function getTransactions($conn) {
    try {
        $stmt = $conn->query("SELECT * FROM transactions ORDER BY tanggal DESC");
        $transactions = $stmt->fetchAll();
        echo json_encode(["success" => true, "data" => $transactions]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function createTransaction($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['nama_produk']) || !isset($data['qty']) || !isset($data['harga'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields: nama_produk, qty, harga"]);
            return;
        }
        
        $id = generateUUID();
        $nama_produk = trim($data['nama_produk']);
        $qty = intval($data['qty']);
        $harga = floatval($data['harga']);
        $total = $qty * $harga;
        
        // Accept payment method - use 'Tunai' as default
        $metode = isset($data['metode_pembayaran']) ? trim($data['metode_pembayaran']) : 'Tunai';
        
        // Use basic INSERT that works with existing schema (without product_id column)
        $stmt = $conn->prepare("INSERT INTO transactions (id, nama_produk, qty, harga, total, metode_pembayaran) VALUES (:id, :nama_produk, :qty, :harga, :total, :metode)");
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':nama_produk', $nama_produk);
        $stmt->bindParam(':qty', $qty);
        $stmt->bindParam(':harga', $harga);
        $stmt->bindParam(':total', $total);
        $stmt->bindParam(':metode', $metode);
        $stmt->execute();
        
        // Update product stock if product_id provided (optional - only if column exists)
        if (isset($data['product_id']) && $data['product_id']) {
            try {
                $updateStmt = $conn->prepare("UPDATE products SET stok = stok - :qty WHERE id = :product_id AND stok >= :qty2");
                $updateStmt->bindParam(':qty', $qty);
                $updateStmt->bindParam(':product_id', $data['product_id']);
                $updateStmt->bindParam(':qty2', $qty);
                $updateStmt->execute();
            } catch (PDOException $e) {
                // Silently ignore if update fails (stock tracking is optional)
            }
        }
        
        echo json_encode([
            "success" => true,
            "message" => "Transaction created successfully",
            "data" => [
                "id" => $id,
                "nama_produk" => $nama_produk,
                "qty" => $qty,
                "harga" => $harga,
                "total" => $total,
                "metode_pembayaran" => $metode
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function updateTransaction($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing transaction id"]);
            return;
        }
        
        $id = $data['id'];
        $updates = [];
        $params = [':id' => $id];
        
        $qty = null;
        $harga = null;
        
        if (isset($data['nama_produk'])) {
            $updates[] = "nama_produk = :nama_produk";
            $params[':nama_produk'] = trim($data['nama_produk']);
        }
        if (isset($data['qty'])) {
            $updates[] = "qty = :qty";
            $params[':qty'] = intval($data['qty']);
            $qty = intval($data['qty']);
        }
        if (isset($data['harga'])) {
            $updates[] = "harga = :harga";
            $params[':harga'] = floatval($data['harga']);
            $harga = floatval($data['harga']);
        }
        if (isset($data['metode_pembayaran'])) {
            $updates[] = "metode_pembayaran = :metode";
            $params[':metode'] = trim($data['metode_pembayaran']);
        }
        
        // Recalculate total if qty or harga changed
        if ($qty !== null || $harga !== null) {
            // Get current values if not provided
            if ($qty === null || $harga === null) {
                $currentStmt = $conn->prepare("SELECT qty, harga FROM transactions WHERE id = :id");
                $currentStmt->bindParam(':id', $id);
                $currentStmt->execute();
                $current = $currentStmt->fetch();
                
                if ($current) {
                    if ($qty === null) $qty = intval($current['qty']);
                    if ($harga === null) $harga = floatval($current['harga']);
                }
            }
            
            $total = $qty * $harga;
            $updates[] = "total = :total";
            $params[':total'] = $total;
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["error" => "No fields to update"]);
            return;
        }
        
        $sql = "UPDATE transactions SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $conn->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        
        echo json_encode(["success" => true, "message" => "Transaction updated successfully"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function deleteTransaction($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing transaction id"]);
            return;
        }
        
        $id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM transactions WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Transaction deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Transaction not found"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
?>
