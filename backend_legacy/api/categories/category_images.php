<?php
require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/auth_helper.php';

// Ensure DB errors are catchable so we can always return JSON.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// CORS Headers - Allow both ports
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {

// GET - Fetch all category images or specific category
if ($method === 'GET') {
    $category_slug = isset($_GET['category']) ? $_GET['category'] : null;
    
    if ($category_slug) {
        // Fetch specific category image
        $stmt = $conn->prepare("SELECT * FROM category_images WHERE category_slug = ?");
        $stmt->bind_param("s", $category_slug);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            send_success('Category image fetched successfully', $row);
        } else {
            send_error('Category image not found', 404);
        }
    } else {
        // Fetch all category images
        $result = $conn->query("SELECT * FROM category_images ORDER BY category_slug");
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
        send_success('Category images fetched successfully', $categories);
    }
}

// POST - Create or update category image (admin only)
else if ($method === 'POST') {
    $user = verify_auth($conn);
    if (!$user) {
        send_error('Unauthorized access', 401);
        exit;
    }
    if (!$user || $user['role'] !== 'admin') {
        send_error('Admin access required', 403);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $category_slug = $data['category_slug'] ?? null;
    $image_url = $data['image_url'] ?? null;
    
    if (empty($category_slug) || empty($image_url)) {
        send_error('Category slug and image URL are required', 400);
        exit;
    }
    
    // Check if category image exists
    $stmt = $conn->prepare("SELECT id FROM category_images WHERE category_slug = ?");
    $stmt->bind_param("s", $category_slug);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing
        $stmt = $conn->prepare("UPDATE category_images SET image_url = ? WHERE category_slug = ?");
        $stmt->bind_param("ss", $image_url, $category_slug);
        $stmt->execute();
        send_success('Category image updated successfully');
    } else {
        // Insert new
        $stmt = $conn->prepare("INSERT INTO category_images (category_slug, image_url) VALUES (?, ?)");
        $stmt->bind_param("ss", $category_slug, $image_url);
        $stmt->execute();
        send_success('Category image created successfully', ['id' => $conn->insert_id]);
    }
}

// DELETE - Delete category image (admin only)
else if ($method === 'DELETE') {
    $user = verify_auth($conn);
    if (!$user) {
        send_error('Unauthorized access', 401);
        exit;
    }
    if (!$user || $user['role'] !== 'admin') {
        send_error('Admin access required', 403);
        exit;
    }
    
    $category_slug = $_GET['category'] ?? null;
    
    if (empty($category_slug)) {
        send_error('Category slug required', 400);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM category_images WHERE category_slug = ?");
    $stmt->bind_param("s", $category_slug);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        send_success('Category image deleted successfully');
    } else {
        send_error('Category image not found', 404);
    }
}

else {
    send_error('Method not allowed', 405);
}

} catch (mysqli_sql_exception $e) {
    // Common case in production: table not created yet.
    // MySQL error 1146: Table doesn't exist.
    if ((int)$e->getCode() === 1146 && $method === 'GET') {
        send_success('Category images not configured', []);
    }

    // Generic server error (don’t leak DB details).
    send_error('Server error', 500);
} catch (Throwable $e) {
    send_error('Server error', 500);
}
