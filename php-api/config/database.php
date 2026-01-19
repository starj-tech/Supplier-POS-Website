<?php
// Database Configuration
// Note: CORS headers are now handled in cors.php

class Database {
    private $host = "156.67.221.195";
    private $db_name = "admin_pos";
    private $username = "admin_pos";
    private $password = "1GRyTauTW6";
    private $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
            exit();
        }

        return $this->conn;
    }
}
?>
