<?php
// CORS Configuration - Include this FIRST in all API endpoints
// This ensures CORS headers are sent even if PHP errors occur

// Prevent any output before headers
ob_start();

// Get the origin from request (for dynamic CORS if needed later)
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';

// Set CORS headers - MUST be before any other output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Allow-Credentials: false");
header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours
header("Content-Type: application/json; charset=UTF-8");

// Prevent caching of API responses
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Handle preflight OPTIONS request - MUST be handled before any other logic
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Clean any output and send 200
    ob_end_clean();
    http_response_code(200);
    exit();
}
?>
