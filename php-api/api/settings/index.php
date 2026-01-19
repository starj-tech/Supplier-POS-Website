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
        getSettings($conn);
        break;
    case 'PUT':
        updateSettings($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

function getSettings($conn) {
    try {
        $stmt = $conn->query("SELECT * FROM store_settings WHERE id = 1");
        $settings = $stmt->fetch();
        
        if ($settings) {
            echo json_encode(["success" => true, "data" => $settings]);
        } else {
            // Create default settings if not exists
            $insertStmt = $conn->prepare("INSERT INTO store_settings (id, store_name) VALUES (1, 'Paper Distributor')");
            $insertStmt->execute();
            echo json_encode(["success" => true, "data" => ["id" => 1, "store_name" => "Paper Distributor", "store_logo" => null]]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function updateSettings($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $updates = [];
        $params = [];
        
        if (isset($data['store_name'])) {
            $updates[] = "store_name = :store_name";
            $params[':store_name'] = trim($data['store_name']);
        }
        if (isset($data['store_logo'])) {
            $updates[] = "store_logo = :store_logo";
            $params[':store_logo'] = $data['store_logo'];
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["error" => "No fields to update"]);
            return;
        }
        
        $sql = "UPDATE store_settings SET " . implode(", ", $updates) . " WHERE id = 1";
        $stmt = $conn->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        
        echo json_encode(["success" => true, "message" => "Settings updated successfully"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
