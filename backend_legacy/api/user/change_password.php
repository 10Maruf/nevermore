<?php
/**
 * Change password (current/new/confirm). No email verification.
 * Method: POST
 * Body: JSON { current_password, new_password, confirm_password }
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

$current = (string)($input['current_password'] ?? '');
$newPass = (string)($input['new_password'] ?? '');
$confirm = (string)($input['confirm_password'] ?? '');

if ($newPass !== $confirm) {
    send_error('New password and confirm password do not match', 400);
}

$check = validate_password($newPass);
if (!$check['valid']) {
    send_error($check['message'], 400);
}

$stmt = $conn->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();
if (!$res || $res->num_rows === 0) {
    send_error('User not found', 404);
}
$row = $res->fetch_assoc();
$hash = (string)($row['password'] ?? '');

if (!verify_password($current, $hash)) {
    send_error('Current password is incorrect', 400);
}

$newHash = hash_password($newPass);

$conn->begin_transaction();
try {
    $stmt2 = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt2->bind_param('si', $newHash, $userId);
    if (!$stmt2->execute()) {
        throw new Exception('Failed to update password');
    }

    // Logout all sessions for safety
    $stmt3 = $conn->prepare('DELETE FROM session WHERE user_id = ?');
    $stmt3->bind_param('i', $userId);
    $stmt3->execute();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    send_error('Failed to change password', 500);
}

send_success('Password changed. Please login again.');
