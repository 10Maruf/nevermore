<?php
// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

require_once '../../config/config.php';
require_once '../../utils/auth_helper.php';
require_once '../../utils/response.php';

// Verify user is authenticated
$user = require_auth($conn);
$user_id = $user['id'];

// Get design ID from query parameter
$design_id = $_GET['id'] ?? null;

if (!$design_id) {
    send_error('Design ID is required', 400);
}

try {
    // Fetch the specific design
    $stmt = $conn->prepare("
        SELECT id, design_name, preview_url, garment_type, garment_color,
               garment_size, technique, print_type, embroidery_type,
               design_data, created_at, updated_at
        FROM custom_designs
        WHERE id = ? AND user_id = ?
    ");
    
    $stmt->bind_param("ii", $design_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $design = $result->fetch_assoc();
    
    if (!$design) {
        send_error('Design not found or unauthorized', 404);
    }
    
    // Decode design_data JSON
    $design['design_data'] = json_decode($design['design_data'], true);
    
    // Get associated assets
    $asset_stmt = $conn->prepare("
        SELECT id, asset_url, upload_date
        FROM design_assets
        WHERE design_id = ? AND user_id = ?
        ORDER BY upload_date ASC
    ");
    $asset_stmt->bind_param("ii", $design_id, $user_id);
    $asset_stmt->execute();
    $asset_result = $asset_stmt->get_result();
    $design['assets'] = $asset_result->fetch_all(MYSQLI_ASSOC);
    
    send_success('Design retrieved successfully', $design);
    
} catch (Exception $e) {
    error_log("Get design error: " . $e->getMessage());
    send_error('Failed to retrieve design', 500);
}
