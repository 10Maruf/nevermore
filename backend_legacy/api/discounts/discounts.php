<?php
require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/auth_helper.php';

// CORS Headers
header('Access-Control-Allow-Origin: https://evermorebrand.com');
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

// GET - Fetch all discounts or validate a discount code
if ($method === 'GET') {
    $code = isset($_GET['code']) ? trim($_GET['code']) : null;
    
    // Validate discount code (public endpoint)
    if ($code) {
        $stmt = $conn->prepare("SELECT * FROM discount_codes WHERE code = ? AND status = 'active'");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            send_error('Invalid discount code', 404);
            exit;
        }
        
        $discount = $result->fetch_assoc();
        
        // Check if expired
        if ($discount['expiry_date'] && strtotime($discount['expiry_date']) < time()) {
            send_error('Discount code has expired', 400);
            exit;
        }
        
        // Check if max uses reached
        if ($discount['max_uses'] && $discount['current_uses'] >= $discount['max_uses']) {
            send_error('Discount code has reached maximum uses', 400);
            exit;
        }
        
        send_success('Discount code is valid', $discount);
        exit;
    }
    
    // List all discounts (admin only)
    $user = verify_auth($conn);
    if (!$user) {
        send_error('Unauthorized access', 401);
        exit;
    }
    if (!$user || $user['role'] !== 'admin') {
        send_error('Admin access required', 403);
        exit;
    }
    
    $result = $conn->query("SELECT * FROM discount_codes ORDER BY created_at DESC");
    $discounts = [];
    while ($row = $result->fetch_assoc()) {
        $discounts[] = $row;
    }
    
    send_success('Discounts fetched successfully', $discounts);
}

// POST - Create new discount (admin only)
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
    
    $code = strtoupper(trim($data['code']));
    $type = $data['type']; // 'percentage' or 'fixed'
    $value = floatval($data['value']);
    $min_purchase = isset($data['min_purchase']) ? floatval($data['min_purchase']) : 0;
    $expiry_date = isset($data['expiry_date']) && $data['expiry_date'] ? $data['expiry_date'] : null;
    $max_uses = isset($data['max_uses']) && $data['max_uses'] ? intval($data['max_uses']) : null;
    
    // Validation
    if (empty($code) || empty($type) || $value <= 0) {
        send_error('Code, type, and value are required', 400);
        exit;
    }
    
    if (!in_array($type, ['percentage', 'fixed'])) {
        send_error('Invalid discount type', 400);
        exit;
    }
    
    // Check if code already exists
    $stmt = $conn->prepare("SELECT id FROM discount_codes WHERE code = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        send_error('Discount code already exists', 400);
        exit;
    }
    
    // Insert discount
    $stmt = $conn->prepare("INSERT INTO discount_codes (code, type, value, min_purchase, expiry_date, max_uses, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
    $stmt->bind_param("ssdisi", $code, $type, $value, $min_purchase, $expiry_date, $max_uses);
    
    if ($stmt->execute()) {
        send_success('Discount created successfully', ['id' => $conn->insert_id]);
    } else {
        send_error('Failed to create discount', 500);
    }
}

// DELETE - Delete discount (admin only)
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
    
    $id = intval($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        send_error('Discount ID required', 400);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM discount_codes WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        send_success('Discount deleted successfully');
    } else {
        send_error('Discount not found', 404);
    }
}

else {
    send_error('Method not allowed', 405);
}
