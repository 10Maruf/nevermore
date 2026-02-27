<?php
/**
 * Image Upload API for Admin
 * Purpose: Handle image uploads for product management
 * Method: POST (multipart/form-data)
 * Field: image
 * Returns: JSON with image URL
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/auth_helper.php';

// CORS Headers - Allow both ports
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication (robust across Apache/XAMPP header casing)
$user = verify_auth($conn);
if (!$user) {
    send_error('Invalid or expired token. Please login again.', 401);
    exit;
}

if (($user['role'] ?? '') !== 'admin') {
    send_error('Admin access required. Please login with an admin account. Current user: ' . ($user['email'] ?? ''), 403);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $error_message = 'No file uploaded';
    if (isset($_FILES['image'])) {
        switch ($_FILES['image']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $error_message = 'File is too large';
                break;
            case UPLOAD_ERR_PARTIAL:
                $error_message = 'File upload was incomplete';
                break;
            case UPLOAD_ERR_NO_FILE:
                $error_message = 'No file was uploaded';
                break;
            default:
                $error_message = 'File upload failed';
        }
    }
    send_error($error_message, 400);
    exit;
}

$file = $_FILES['image'];

// Validate file type
$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
$file_type = mime_content_type($file['tmp_name']);

if (!in_array($file_type, $allowed_types)) {
    send_error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.', 400);
    exit;
}

// Validate file extension
$allowed_extensions = ['jpg', 'jpeg', 'png', 'webp'];
$file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($file_extension, $allowed_extensions)) {
    send_error('Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.', 400);
    exit;
}

// Validate file size (max 5MB)
$max_file_size = 5 * 1024 * 1024; // 5MB in bytes
if ($file['size'] > $max_file_size) {
    send_error('File is too large. Maximum size is 5MB.', 400);
    exit;
}

// Create uploads directory if it doesn't exist
$upload_base_dir = dirname(__DIR__, 2) . '/uploads';
$upload_dir = $upload_base_dir . '/products';

if (!file_exists($upload_base_dir)) {
    mkdir($upload_base_dir, 0755, true);
}

if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Generate unique filename
$unique_filename = uniqid('product_', true) . '_' . time() . '.' . $file_extension;
$upload_path = $upload_dir . '/' . $unique_filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
    send_error('Failed to save uploaded file', 500);
    exit;
}

// Return the public URL path
$public_url = '/backend/uploads/products/' . $unique_filename;

send_success('Image uploaded successfully', [
    'image_url' => $public_url,
    'filename' => $unique_filename,
    'size' => $file['size'],
    'type' => $file_type
]);

?>
