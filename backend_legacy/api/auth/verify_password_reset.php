<?php
/**
 * Verify password reset token
 * Method: GET
 * Query: token
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/config.php';
require_once '../../utils/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed. Use GET.', 405);
}

$token = isset($_GET['token']) ? trim($_GET['token']) : '';
if ($token === '') {
    send_error('Token is required', 400);
}

$token_hash = hash('sha256', $token);

$stmt = $conn->prepare('SELECT id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1');
$stmt->bind_param('s', $token_hash);
$stmt->execute();
$res = $stmt->get_result();

if ($res && $res->num_rows > 0) {
    send_success('Token is valid');
}

send_error('Invalid or expired token', 400);
