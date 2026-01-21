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
        try {
        // Ambil semua produk milik user yang sedang login
            $stmt = $conn->prepare("
                SELECT 
                    id,
                    name,
                     code,
                    stock,
                    purchase_price,
                    selling_price,
                    (stock * purchase_price) AS total_modal,
                    (stock * (selling_price - purchase_price)) AS estimasi_keuntungan
                FROM products
                WHERE user_id = :user_id
                ORDER BY created_at DESC
            ");

            $stmt->execute([
                ':user_id' => $currentUser['id']
            ]);

            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Hitung ringkasan untuk dashboard
            $totalStock = 0;
            $totalModal = 0;
            $totalEstimasiKeuntungan = 0;

            foreach ($products as $product) {
                $totalStock += (int)$product['stock'];
                $totalModal += (float)$product['total_modal'];
                $totalEstimasiKeuntungan += (float)$product['estimasi_keuntungan'];
            }

            echo json_encode([
                "success" => true,
                "data" => $products,
                "summary" => [
                    "total_stock" => $totalStock,
                    "total_modal" => $totalModal,
                    "estimasi_keuntungan" => $totalEstimasiKeuntungan
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => $e->getMessage()
            ]);
        }
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            $id = generateUUID();

            $query = "INSERT INTO products 
                (id, name, code, stock, purchase_price, selling_price, user_id)
                VALUES (:id, :name, :code, :stock, :purchase_price, :selling_price, :user_id)";

            $stmt = $conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':name' => $data['name'],
                ':code' => $data['code'],
                ':stock' => $data['stock'],
                ':purchase_price' => $data['purchase_price'],
                ':selling_price' => $data['selling_price'],
                ':user_id' => $currentUser['id']
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Product created"
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
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
        echo json_encode(["error" => $e->getMessage()]);
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
        $nama = trim($data['nama']);
        $harga = floatval($data['harga']);
        $stok = isset($data['stok']) ? intval($data['stok']) : 0;
        
        $stmt = $conn->prepare("INSERT INTO products (id, nama, harga, stok) VALUES (:id, :nama, :harga, :stok)");
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':nama', $nama);
        $stmt->bindParam(':harga', $harga);
        $stmt->bindParam(':stok', $stok);
        $stmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => "Product created successfully",
            "data" => ["id" => $id, "nama" => $nama, "harga" => $harga, "stok" => $stok]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
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
        
        if (isset($data['nama'])) {
            $updates[] = "nama = :nama";
            $params[':nama'] = trim($data['nama']);
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
        echo json_encode(["error" => $e->getMessage()]);
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
