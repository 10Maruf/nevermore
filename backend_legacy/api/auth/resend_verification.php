<?php
/**
 * Resend Email Verification
 * Method: POST
 * Body: JSON { email }
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? (string)$_SERVER['HTTP_ORIGIN'] : '';
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

// Ensure required columns exist for email verification
$needCols = ['email_verification_token', 'email_verification_expires_at', 'email_verified_at'];
foreach ($needCols as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    if (!$col || $col->num_rows === 0) {
        send_error('Email verification is not configured in DB. Please run the email verification migration SQL in cPanel phpMyAdmin.', 500);
    }
}

$stmt = $conn->prepare('SELECT id, username, email_verified_at FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    send_error('Email not found. Please sign up first.', 404);
}

$user = $res->fetch_assoc();
$verifiedAt = $user['email_verified_at'] ?? null;
if (!empty($verifiedAt)) {
    send_success('Your email is already verified. Please login.');
}

$userId = (int)$user['id'];
$username = (string)($user['username'] ?? '');

$verification_token = bin2hex(random_bytes(32));
$verification_expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'evermorebrand.com';
$base = $scheme . '://' . $host;

$originForReturn = isset($_SERVER['HTTP_ORIGIN']) ? trim((string)$_SERVER['HTTP_ORIGIN']) : '';
$verify_link = $base . '/backend/api/auth/verify_email.php?token=' . urlencode($verification_token);
if ($originForReturn !== '') {
    $verify_link .= '&return_to=' . urlencode($originForReturn);
}

$upd = $conn->prepare('UPDATE users SET email_verification_token = ?, email_verification_expires_at = ? WHERE id = ?');
$upd->bind_param('ssi', $verification_token, $verification_expires_at, $userId);
$upd->execute();

$subject = 'Verify your email - Evermore';
$useName = $username !== '' ? $username : 'there';
$bodyHtml = '<p>Hi ' . htmlspecialchars($useName) . ',</p>'
    . '<p>Please verify your email by clicking the link below:</p>'
    . '<p><a href="' . htmlspecialchars($verify_link) . '">Verify Email</a></p>'
    //. '<p>If the button doesn\'t work, copy and paste this URL:</p>'
    //. '<p>' . htmlspecialchars($verify_link) . '</p>'
    //. '<p>This link expires in 24 hours.</p>'
    ;
$bodyText = "Hi $useName,\n\nVerify your email:\n$verify_link\n\nThis link expires in 24 hours.";

$sent = send_email_html($email, $subject, $bodyHtml, $bodyText);

if (!$sent) {
    send_error('Could not send verification email. Please try again later.', 500);
}

send_success('We sent you a new verification email. Please check your inbox.', [
    'user_id' => $userId,
    'email' => $email,
    'verification_sent' => true,
]);
