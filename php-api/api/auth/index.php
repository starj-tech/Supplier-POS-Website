<?php
// CORS must be first - before any other code
require_once '../../config/cors.php';
require_once '../../config/database.php';

$database = new Database();
$conn = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

switch ($action) {
    case 'login':
        login($conn);
        break;
    case 'register':
        register($conn);
        break;
    case 'logout':
        logout($conn);
        break;
    case 'verify':
        verifyToken($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action. Use ?action=login, ?action=register, ?action=logout, or ?action=verify"]);
}

function login($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['email']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing email or password"]);
            return;
        }
        
        $email = strtolower(trim($data['email']));
        $password = $data['password'];
        
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(["error" => "Email atau password salah"]);
            return;
        }
        
        // Generate token and save to database
        $token = bin2hex(random_bytes(32));
        $tokenId = generateUUID();
        $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days')); // Token valid for 7 days
        
        // Delete old tokens for this user
        $deleteStmt = $conn->prepare("DELETE FROM user_tokens WHERE user_id = :user_id");
        $deleteStmt->bindParam(':user_id', $user['id']);
        $deleteStmt->execute();
        
        // Insert new token
        $insertStmt = $conn->prepare("INSERT INTO user_tokens (id, user_id, token, expires_at) VALUES (:id, :user_id, :token, :expires_at)");
        $insertStmt->bindParam(':id', $tokenId);
        $insertStmt->bindParam(':user_id', $user['id']);
        $insertStmt->bindParam(':token', $token);
        $insertStmt->bindParam(':expires_at', $expiresAt);
        $insertStmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "data" => [
                "id" => $user['id'],
                "email" => $user['email'],
                "full_name" => $user['full_name'],
                "token" => $token
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function register($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['email']) || !isset($data['password']) || !isset($data['full_name'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields: email, password, full_name"]);
            return;
        }
        
        $email = strtolower(trim($data['email']));
        $password = password_hash($data['password'], PASSWORD_DEFAULT);
        $fullName = trim($data['full_name']);
        
        // Check if email already exists
        $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
        $checkStmt->bindParam(':email', $email);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "Email sudah terdaftar"]);
            return;
        }
        
        $id = generateUUID();
        
        $stmt = $conn->prepare("INSERT INTO users (id, email, password, full_name) VALUES (:id, :email, :password, :full_name)");
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':password', $password);
        $stmt->bindParam(':full_name', $fullName);
        $stmt->execute();
        
        // Generate token and save to database
        $token = bin2hex(random_bytes(32));
        $tokenId = generateUUID();
        $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));
        
        $insertStmt = $conn->prepare("INSERT INTO user_tokens (id, user_id, token, expires_at) VALUES (:id, :user_id, :token, :expires_at)");
        $insertStmt->bindParam(':id', $tokenId);
        $insertStmt->bindParam(':user_id', $id);
        $insertStmt->bindParam(':token', $token);
        $insertStmt->bindParam(':expires_at', $expiresAt);
        $insertStmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => "Registration successful",
            "data" => [
                "id" => $id,
                "email" => $email,
                "full_name" => $fullName,
                "token" => $token
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function logout($conn) {
    try {
        // Get token from header
        $headers = getallheaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        if (empty($authHeader) && isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }
        
        $token = str_replace('Bearer ', '', $authHeader);
        
        if (!empty($token)) {
            // Delete the token
            $stmt = $conn->prepare("DELETE FROM user_tokens WHERE token = :token");
            $stmt->bindParam(':token', $token);
            $stmt->execute();
        }
        
        echo json_encode([
            "success" => true,
            "message" => "Logout successful"
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function verifyToken($conn) {
    try {
        // Get token from header
        $headers = getallheaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        if (empty($authHeader) && isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }
        
        $token = str_replace('Bearer ', '', $authHeader);
        
        if (empty($token)) {
            http_response_code(401);
            echo json_encode(["error" => "Token tidak ditemukan"]);
            return;
        }
        
        // Check if token is valid
        $stmt = $conn->prepare("SELECT u.id, u.email, u.full_name FROM users u 
                               INNER JOIN user_tokens t ON u.id = t.user_id 
                               WHERE t.token = :token AND t.expires_at > NOW()");
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(["error" => "Token tidak valid atau sudah kadaluarsa"]);
            return;
        }
        
        echo json_encode([
            "success" => true,
            "data" => [
                "id" => $user['id'],
                "email" => $user['email'],
                "full_name" => $user['full_name']
            ]
        ]);
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
