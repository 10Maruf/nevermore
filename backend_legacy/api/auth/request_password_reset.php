<?php
/**
 * Request password reset (email link)
 * Method: POST
 * Body: JSON { email }
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
require_once '../../utils/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if ($input === null) {
    send_error('Invalid JSON format');
}

$validation = validate_required_fields($input, ['email']);
if (!$validation['valid']) {
    send_error('Missing required fields: ' . implode(', ', $validation['missing']));
}

$email = sanitize_string($input['email']);
if (!validate_email($email)) {
    send_error('Invalid email format');
}

try {
    $stmt = $conn->prepare('SELECT COUNT(*) as c FROM password_resets WHERE email = ? AND created_at > (NOW() - INTERVAL 1 MINUTE)');
    if ($stmt) {
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res ? $res->fetch_assoc() : null;
        if ($row && intval($row['c']) >= 3) {
            send_success('A password reset link has been sent to your email address.');
        }
    }
} catch (Throwable $e) {
    
}


$stmt = $conn->prepare('SELECT id, email FROM users WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();

$successPayload = [];

if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();

    $token = bin2hex(random_bytes(32));
    $token_hash = hash('sha256', $token);
    $expires_at = date('Y-m-d H:i:s', strtotime('+30 minutes'));

    $request_ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null;
    $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null;

    // Invalidate old unused tokens for this user
    try {
        $stmtDel = $conn->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL');
        if ($stmtDel) {
            $stmtDel->bind_param('i', $user['id']);
            $stmtDel->execute();
        }
    } catch (Throwable $e) {
    }

    $stmt2 = $conn->prepare('INSERT INTO password_resets (user_id, email, token_hash, expires_at, created_at, request_ip, user_agent) VALUES (?, ?, ?, ?, NOW(), ?, ?)');
    $stmt2->bind_param('isssss', $user['id'], $user['email'], $token_hash, $expires_at, $request_ip, $user_agent);
    $stmt2->execute();

    // Use production app URL
    $appUrl = getenv('EVERMORE_APP_URL') ?: 'https://evermorebrand.com';
    $resetUrl = rtrim($appUrl, '/') . '/reset-password?token=' . urlencode($token);

    $subject = 'Reset your Evermore password';
    $bodyHtml = '<p>We received a request to reset your password.</p>'
        . '<p>Use this link to set a new password:</p>'
        . '<p><a href="' . htmlspecialchars($resetUrl) . '">Reset Password</a></p>'
        //. '<p>If the button doesn\'t work, copy and paste this URL:</p>'
        //. '<p>' . htmlspecialchars($resetUrl) . '</p>'
        . '<p>If you did not request this, you can ignore this email.</p>';
    $bodyText = "We received a request to reset your password.\n\n" .
        "Use this link to set a new password (valid for 30 minutes):\n" .
        $resetUrl . "\n\n" .
        "If you did not request this, you can ignore this email.\n";

    $sent = send_email_html($user['email'], $subject, $bodyHtml, $bodyText);
}

send_success('A password reset link has been sent to your email address.', $successPayload);
