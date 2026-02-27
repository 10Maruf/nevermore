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

try {
    // Fetch all designs for the user
    $stmt = $conn->prepare("
        SELECT id, design_name, preview_url, garment_type, garment_color,
               garment_size, technique, print_type, embroidery_type,
               design_data, created_at, updated_at
        FROM custom_designs
        WHERE user_id = ?
        ORDER BY updated_at DESC
    ");
    
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $designs = $result->fetch_all(MYSQLI_ASSOC);
    
    // Decode design_data JSON for each design
    foreach ($designs as &$design) {
        $design['design_data'] = json_decode($design['design_data'], true);
    }
    
    // Also get asset count for each design
    $asset_stmt = $conn->prepare("
        SELECT design_id, COUNT(*) as asset_count
        FROM design_assets
        WHERE user_id = ? AND design_id IS NOT NULL
        GROUP BY design_id
    ");
    $asset_stmt->bind_param("i", $user_id);
    $asset_stmt->execute();
    $asset_result = $asset_stmt->get_result();
    
    $asset_counts = [];
    while ($row = $asset_result->fetch_assoc()) {
        $asset_counts[$row['design_id']] = $row['asset_count'];
    }
    
    // Add asset count to each design
    foreach ($designs as &$design) {
        $design['asset_count'] = $asset_counts[$design['id']] ?? 0;
    }
    
    send_success('Designs retrieved successfully', [
        'designs' => $designs,
        'total' => count($designs)
    ]);
    
} catch (Exception $e) {
    error_log("Get designs error: " . $e->getMessage());
    send_error('Failed to retrieve designs', 500);
}
