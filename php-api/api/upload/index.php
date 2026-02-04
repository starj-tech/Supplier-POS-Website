<?php
// CORS must be first - before any other code
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../middleware/auth.php';

// Validate token for all requests - this protects the endpoint
$currentUser = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        handleUpload();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

function handleUpload() {
    try {
        // Check if file was uploaded
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'File terlalu besar (batas server)',
                UPLOAD_ERR_FORM_SIZE => 'File terlalu besar (batas form)',
                UPLOAD_ERR_PARTIAL => 'File hanya terupload sebagian',
                UPLOAD_ERR_NO_FILE => 'Tidak ada file yang diupload',
                UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary tidak ditemukan',
                UPLOAD_ERR_CANT_WRITE => 'Gagal menulis file',
                UPLOAD_ERR_EXTENSION => 'Upload dihentikan oleh extension'
            ];
            $errorCode = isset($_FILES['image']) ? $_FILES['image']['error'] : UPLOAD_ERR_NO_FILE;
            $errorMsg = isset($errorMessages[$errorCode]) ? $errorMessages[$errorCode] : 'Upload error';
            
            http_response_code(400);
            echo json_encode(["error" => $errorMsg]);
            return;
        }
        
        $file = $_FILES['image'];
        
        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedTypes)) {
            http_response_code(400);
            echo json_encode(["error" => "Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP"]);
            return;
        }
        
        // Validate file size (max 5MB)
        $maxSize = 5 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(["error" => "Ukuran file maksimal 5MB"]);
            return;
        }
        
        // Create upload directory if it doesn't exist
        $uploadDir = __DIR__ . '/../../uploads/products/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate unique filename
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!$extension) {
            // Get extension from mime type
            $mimeToExt = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/gif' => 'gif',
                'image/webp' => 'webp'
            ];
            $extension = $mimeToExt[$mimeType] ?? 'jpg';
        }
        $filename = uniqid('product_') . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            http_response_code(500);
            echo json_encode(["error" => "Gagal menyimpan file"]);
            return;
        }
        
        // Return the relative path for storage in database
        $relativePath = '/uploads/products/' . $filename;
        
        // Build full URL
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $basePath = dirname(dirname(dirname($_SERVER['SCRIPT_NAME'])));
        $fullUrl = $protocol . '://' . $host . $basePath . $relativePath;
        
        echo json_encode([
            "success" => true,
            "message" => "File berhasil diupload",
            "data" => [
                "filename" => $filename,
                "path" => $relativePath,
                "url" => $fullUrl,
                "size" => $file['size'],
                "type" => $mimeType
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Server error: " . $e->getMessage()]);
    }
}

function handleDelete() {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['filename'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing filename"]);
            return;
        }
        
        $filename = basename($data['filename']); // Sanitize to prevent directory traversal
        $filepath = __DIR__ . '/../../uploads/products/' . $filename;
        
        if (!file_exists($filepath)) {
            http_response_code(404);
            echo json_encode(["error" => "File tidak ditemukan"]);
            return;
        }
        
        if (!unlink($filepath)) {
            http_response_code(500);
            echo json_encode(["error" => "Gagal menghapus file"]);
            return;
        }
        
        echo json_encode([
            "success" => true,
            "message" => "File berhasil dihapus"
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Server error: " . $e->getMessage()]);
    }
}
?>
