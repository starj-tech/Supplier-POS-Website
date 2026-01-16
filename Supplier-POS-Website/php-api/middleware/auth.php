<?php
// Authentication Middleware
// This file validates the token for protected routes

require_once __DIR__ . '/../config/database.php';

function validateToken($conn) {
    // Get Authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    // Also check for lowercase (some servers convert headers)
    if (empty($authHeader) && isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    }
    
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(["error" => "Token tidak ditemukan. Silakan login terlebih dahulu."]);
        exit();
    }
    
    // Extract token from "Bearer <token>" format
    $token = str_replace('Bearer ', '', $authHeader);
    
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(["error" => "Format token tidak valid"]);
        exit();
    }
    
    try {
        // Check if token exists and is valid
        $stmt = $conn->prepare("SELECT u.* FROM users u 
                               INNER JOIN user_tokens t ON u.id = t.user_id 
                               WHERE t.token = :token AND t.expires_at > NOW()");
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(["error" => "Token tidak valid atau sudah kadaluarsa. Silakan login kembali."]);
            exit();
        }
        
        // Return user data for use in protected routes
        return [
            'id' => $user['id'],
            'email' => $user['email'],
            'full_name' => $user['full_name']
        ];
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        exit();
    }
}

function requireAuth() {
    $database = new Database();
    $conn = $database->getConnection();
    return validateToken($conn);
}
?>
