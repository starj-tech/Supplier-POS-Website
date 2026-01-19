<?php
// CORS must be first - before any other code
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';

$database = new Database();
$conn = $database->getConnection();

// Validate token for all requests - this protects the endpoint
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
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function createTransaction($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['nama_produk']) || !isset($data['qty']) || !isset($data['harga'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            return;
        }
        
        $id = generateUUID();
        $nama_produk = trim($data['nama_produk']);
        $qty = intval($data['qty']);
        $harga = floatval($data['harga']);
        $total = $qty * $harga;
        $metode = isset($data['metode_pembayaran']) ? $data['metode_pembayaran'] : 'cash';
        
        $stmt = $conn->prepare("INSERT INTO transactions (id, nama_produk, qty, harga, total, metode_pembayaran) VALUES (:id, :nama_produk, :qty, :harga, :total, :metode)");
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':nama_produk', $nama_produk);
        $stmt->bindParam(':qty', $qty);
        $stmt->bindParam(':harga', $harga);
        $stmt->bindParam(':total', $total);
        $stmt->bindParam(':metode', $metode);
        $stmt->execute();
        
        // Update product stock if product_id provided
        if (isset($data['product_id'])) {
            $updateStmt = $conn->prepare("UPDATE products SET stok = stok - :qty WHERE id = :product_id AND stok >= :qty");
            $updateStmt->bindParam(':qty', $qty);
            $updateStmt->bindParam(':product_id', $data['product_id']);
            $updateStmt->execute();
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
        echo json_encode(["error" => $e->getMessage()]);
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
        
        if (isset($data['nama_produk'])) {
            $updates[] = "nama_produk = :nama_produk";
            $params[':nama_produk'] = trim($data['nama_produk']);
        }
        if (isset($data['qty'])) {
            $updates[] = "qty = :qty";
            $params[':qty'] = intval($data['qty']);
        }
        if (isset($data['harga'])) {
            $updates[] = "harga = :harga";
            $params[':harga'] = floatval($data['harga']);
        }
        if (isset($data['qty']) || isset($data['harga'])) {
            $qty = isset($data['qty']) ? intval($data['qty']) : null;
            $harga = isset($data['harga']) ? floatval($data['harga']) : null;
            
            // Get current values if not provided
            if ($qty === null || $harga === null) {
                $getStmt = $conn->prepare("SELECT qty, harga FROM transactions WHERE id = :id");
                $getStmt->bindParam(':id', $id);
                $getStmt->execute();
                $current = $getStmt->fetch();
                if ($qty === null) $qty = $current['qty'];
                if ($harga === null) $harga = $current['harga'];
            }
            
            $updates[] = "total = :total";
            $params[':total'] = $qty * $harga;
        }
        if (isset($data['metode_pembayaran'])) {
            $updates[] = "metode_pembayaran = :metode";
            $params[':metode'] = $data['metode_pembayaran'];
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
        echo json_encode(["error" => $e->getMessage()]);
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
        echo json_encode(["error" => $e->getMessage()]);
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
