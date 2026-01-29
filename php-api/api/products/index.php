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
        getProducts($conn);
        break;
    case 'POST':
        createProduct($conn);
        break;
    case 'PUT':
        updateProduct($conn);
        break;
    case 'DELETE':
        deleteProduct($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

function getProducts($conn) {
    try {
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM products WHERE id = :id");
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $product = $stmt->fetch();
            
            if ($product) {
                echo json_encode(["success" => true, "data" => $product]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Product not found"]);
            }
        } else {
            $stmt = $conn->query("SELECT * FROM products ORDER BY nama ASC");
            $products = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $products]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function createProduct($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['nama']) || !isset($data['harga'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields: nama, harga"]);
            return;
        }
        
        $id = generateUUID();
        $kode_produk = isset($data['kode_produk']) ? trim($data['kode_produk']) : null;
        $nama = trim($data['nama']);
        $gambar = isset($data['gambar']) ? $data['gambar'] : null;
        $harga_beli = isset($data['harga_beli']) ? floatval($data['harga_beli']) : 0;
        $harga = floatval($data['harga']);
        $stok = isset($data['stok']) ? intval($data['stok']) : 0;
        
        $stmt = $conn->prepare("INSERT INTO products (id, kode_produk, nama, gambar, harga_beli, harga, stok) VALUES (:id, :kode_produk, :nama, :gambar, :harga_beli, :harga, :stok)");
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':kode_produk', $kode_produk);
        $stmt->bindParam(':nama', $nama);
        $stmt->bindParam(':gambar', $gambar);
        $stmt->bindParam(':harga_beli', $harga_beli);
        $stmt->bindParam(':harga', $harga);
        $stmt->bindParam(':stok', $stok);
        $stmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => "Product created successfully",
            "data" => [
                "id" => $id,
                "kode_produk" => $kode_produk,
                "nama" => $nama,
                "gambar" => $gambar,
                "harga_beli" => $harga_beli,
                "harga" => $harga,
                "stok" => $stok
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function updateProduct($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing product id"]);
            return;
        }
        
        $id = $data['id'];
        $updates = [];
        $params = [':id' => $id];
        
        if (isset($data['kode_produk'])) {
            $updates[] = "kode_produk = :kode_produk";
            $params[':kode_produk'] = trim($data['kode_produk']);
        }
        if (isset($data['nama'])) {
            $updates[] = "nama = :nama";
            $params[':nama'] = trim($data['nama']);
        }
        if (isset($data['gambar'])) {
            $updates[] = "gambar = :gambar";
            $params[':gambar'] = $data['gambar'];
        }
        if (isset($data['harga_beli'])) {
            $updates[] = "harga_beli = :harga_beli";
            $params[':harga_beli'] = floatval($data['harga_beli']);
        }
        if (isset($data['harga'])) {
            $updates[] = "harga = :harga";
            $params[':harga'] = floatval($data['harga']);
        }
        if (isset($data['stok'])) {
            $updates[] = "stok = :stok";
            $params[':stok'] = intval($data['stok']);
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["error" => "No fields to update"]);
            return;
        }
        
        $sql = "UPDATE products SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $conn->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        
        echo json_encode(["success" => true, "message" => "Product updated successfully"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}

function deleteProduct($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing product id"]);
            return;
        }
        
        $id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM products WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Product deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Product not found"]);
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
