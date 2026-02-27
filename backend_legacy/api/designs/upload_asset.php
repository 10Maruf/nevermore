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

// Check if file was uploaded
if (!isset($_FILES['asset']) || $_FILES['asset']['error'] !== UPLOAD_ERR_OK) {
    send_error('No file uploaded or upload error occurred', 400);
}

$file = $_FILES['asset'];
$original_filename = basename($file['name']);
$file_tmp = $file['tmp_name'];

// Validate file type (only images)
$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
$file_type = mime_content_type($file_tmp);

if (!in_array($file_type, $allowed_types)) {
    send_error('Invalid file type. Only images are allowed', 400);
}

// Validate file size (max 5MB)
$max_size = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $max_size) {
    send_error('File size exceeds 5MB limit', 400);
}

// Generate unique filename in format: {user_id}_{counter}_asset{num}.{extension}
$file_extension = pathinfo($original_filename, PATHINFO_EXTENSION);

// Get the count of existing assets for this user to generate counter
try {
    $count_stmt = $conn->prepare("SELECT COUNT(*) as count FROM design_assets WHERE user_id = ?");
    if (!$count_stmt) {
        throw new Exception("Database error: " . $conn->error);
    }
    $count_stmt->bind_param("i", $user_id);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $row = $count_result->fetch_assoc();
    $asset_counter = $row['count'] + 1;
    $count_stmt->close();
} catch (Exception $e) {
    error_log("Asset counter error: " . $e->getMessage());
    // Fallback to timestamp-based naming if database query fails
    $asset_counter = time();
}

$unique_filename = $user_id . '_' . $asset_counter . '_asset' . $asset_counter . '.' . $file_extension;
$upload_dir = '../../uploads/designs/';
$upload_path = $upload_dir . $unique_filename;

// Create directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Move uploaded file
if (!move_uploaded_file($file_tmp, $upload_path)) {
    send_error('Failed to save uploaded file', 500);
}

// Generate URL for the asset
$asset_url = '/backend/uploads/designs/' . $unique_filename;

// Save asset information to database (upload_date is set automatically via TIMESTAMP DEFAULT)
$stmt = $conn->prepare("INSERT INTO design_assets (user_id, asset_url, original_filename) VALUES (?, ?, ?)");
$stmt->bind_param("iss", $user_id, $asset_url, $original_filename);

if (!$stmt->execute()) {
    // Delete uploaded file if database insert fails
    if (file_exists($upload_path)) {
        unlink($upload_path);
    }
    error_log("Database error: " . $stmt->error);
    send_error('Failed to save asset information', 500);
}

$asset_id = $stmt->insert_id;
$stmt->close();

send_success('Asset uploaded successfully', [
    'asset_id' => $asset_id,
    'asset_url' => $asset_url,
    'original_filename' => $original_filename
]);
