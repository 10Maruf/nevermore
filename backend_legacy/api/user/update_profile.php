<?php
/**
 * Update profile name fields (no email verification required)
 * Method: POST
 * Body: JSON { first_name, last_name }
 * Auth: Bearer token
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/validator.php';
require_once '../../utils/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
}

$authUser = require_auth($conn);
$userId = (int)$authUser['id'];

$input = json_decode(file_get_contents('php://input'), true);
if ($input === null) {
    send_error('Invalid JSON format', 400);
}

$first = isset($input['first_name']) ? sanitize_string($input['first_name']) : '';
$last = isset($input['last_name']) ? sanitize_string($input['last_name']) : '';

if ($first === '' && $last === '') {
    send_error('Nothing to update', 400);
}
if (strlen($first) > 100 || strlen($last) > 100) {
    send_error('Name is too long', 400);
}

// Ensure columns exist
foreach (['first_name', 'last_name'] as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    if (!$col || $col->num_rows === 0) {
        send_error('Profile fields are not configured in DB. Run user_profile_email_change_migration.sql', 500);
    }
}

$stmt = $conn->prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?');
$stmt->bind_param('ssi', $first, $last, $userId);
if (!$stmt->execute()) {
    send_error('Failed to update profile', 500);
}

send_success('Profile updated', [
    'first_name' => $first,
    'last_name' => $last,
]);
