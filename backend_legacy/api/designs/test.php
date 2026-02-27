<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo json_encode([
    'success' => true,
    'message' => 'Design API is working',
    'timestamp' => date('Y-m-d H:i:s'),
    'endpoints' => [
        'upload_asset' => '/api/designs/upload_asset.php',
        'save_design' => '/api/designs/save_design.php',
        'get_designs' => '/api/designs/get_designs.php'
    ]
]);
