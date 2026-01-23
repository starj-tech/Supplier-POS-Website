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
        getExpenses($conn);
        break;
    case 'POST':
        createExpense($conn);
        break;
    case 'PUT':
        updateExpense($conn);
        break;
    case 'DELETE':
        deleteExpense($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

function getExpenses($conn) {
    try {
        $stmt = $conn->query("SELECT * FROM other_expenses ORDER BY date DESC");
        $expenses = $stmt->fetchAll();
        echo json_encode(["success" => true, "data" => $expenses]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function createExpense($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['category']) || !isset($data['cost']) || !isset($data['date'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields: category, cost, date"]);
            return;
        }
        
        $id = generateUUID();
        $category = trim($data['category']);
        $description = isset($data['description']) ? trim($data['description']) : '';
        $cost = floatval($data['cost']);
        $date = $data['date'];
        $notes = isset($data['notes']) ? trim($data['notes']) : '';
        
        $stmt = $conn->prepare("INSERT INTO other_expenses (id, category, description, cost, date, notes) VALUES (:id, :category, :description, :cost, :date, :notes)");
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':category', $category);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':cost', $cost);
        $stmt->bindParam(':date', $date);
        $stmt->bindParam(':notes', $notes);
        $stmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => "Expense created successfully",
            "data" => [
                "id" => $id,
                "category" => $category,
                "description" => $description,
                "cost" => $cost,
                "date" => $date,
                "notes" => $notes
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function updateExpense($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing expense id"]);
            return;
        }
        
        $id = $data['id'];
        $updates = [];
        $params = [':id' => $id];
        
        if (isset($data['category'])) {
            $updates[] = "category = :category";
            $params[':category'] = trim($data['category']);
        }
        if (isset($data['description'])) {
            $updates[] = "description = :description";
            $params[':description'] = trim($data['description']);
        }
        if (isset($data['cost'])) {
            $updates[] = "cost = :cost";
            $params[':cost'] = floatval($data['cost']);
        }
        if (isset($data['date'])) {
            $updates[] = "date = :date";
            $params[':date'] = $data['date'];
        }
        if (isset($data['notes'])) {
            $updates[] = "notes = :notes";
            $params[':notes'] = trim($data['notes']);
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(["error" => "No fields to update"]);
            return;
        }
        
        $sql = "UPDATE other_expenses SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $conn->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        
        echo json_encode(["success" => true, "message" => "Expense updated successfully"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

function deleteExpense($conn) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing expense id"]);
            return;
        }
        
        $id = $data['id'];
        $stmt = $conn->prepare("DELETE FROM other_expenses WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Expense deleted successfully"]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Expense not found"]);
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
