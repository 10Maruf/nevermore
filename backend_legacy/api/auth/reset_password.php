<?php
/**
 * Reset password with token
 * Method: POST
 * Body: JSON { token, password }
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
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

$input = json_decode(file_get_contents('php://input'), true);
if ($input === null) {
    send_error('Invalid JSON format');
}

$validation = validate_required_fields($input, ['token', 'password']);
if (!$validation['valid']) {
    send_error('Missing required fields: ' . implode(', ', $validation['missing']));
}

$token = trim((string)$input['token']);
$newPassword = (string)$input['password'];

if ($token === '' || strlen($token) < 20) {
    send_error('Invalid token', 400);
}

$password_check = validate_password($newPassword);
if (!$password_check['valid']) {
    send_error($password_check['message'], 400);
}

$token_hash = hash('sha256', $token);

$stmt = $conn->prepare('SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1');
$stmt->bind_param('s', $token_hash);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    send_error('Invalid or expired token', 400);
}

$row = $res->fetch_assoc();
$resetId = intval($row['id']);
$userId = intval($row['user_id']);

$hashed_password = hash_password($newPassword);

$conn->begin_transaction();
try {
    // Update password
    $stmt2 = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt2->bind_param('si', $hashed_password, $userId);
    if (!$stmt2->execute()) {
        throw new Exception('Failed to update password');
    }

    // Mark token used
    $stmt3 = $conn->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
    $stmt3->bind_param('i', $resetId);
    if (!$stmt3->execute()) {
        throw new Exception('Failed to mark token as used');
    }

    // Logout all sessions
    $stmt4 = $conn->prepare('DELETE FROM session WHERE user_id = ?');
    $stmt4->bind_param('i', $userId);
    $stmt4->execute();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    send_error('Failed to reset password', 500);
}

send_success('Password updated successfully');
