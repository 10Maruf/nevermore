<?php
/**
 * Request email change (sends verification link to NEW email)
 * Method: POST
 * Body: JSON { email }
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
require_once '../../utils/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
}

$authUser = require_auth($conn);
$userId = (int)$authUser['id'];

$input = json_decode(file_get_contents('php://input'), true);
if ($input === null) {
    send_error('Invalid JSON format', 400);
}

$nextEmail = isset($input['email']) ? sanitize_string($input['email']) : '';
if (!validate_email($nextEmail)) {
    send_error('Invalid email format', 400);
}

// Ensure columns exist
foreach (['pending_email', 'email_change_token_hash', 'email_change_expires_at'] as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    if (!$col || $col->num_rows === 0) {
        send_error('Email change is not configured in DB. Run user_profile_email_change_migration.sql', 500);
    }
}

// Load current email
$stmt = $conn->prepare('SELECT email, username FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();
if (!$res || $res->num_rows === 0) {
    send_error('User not found', 404);
}
$row = $res->fetch_assoc();
$currentEmail = (string)$row['email'];
$username = (string)($row['username'] ?? '');

if (strtolower($nextEmail) === strtolower($currentEmail)) {
    send_success('Email is unchanged');
}

// Check uniqueness
$stmt2 = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
$stmt2->bind_param('si', $nextEmail, $userId);
$stmt2->execute();
$res2 = $stmt2->get_result();
if ($res2 && $res2->num_rows > 0) {
    send_error('This email is already in use.', 400);
}

$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);
$expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'evermorebrand.com';
$base = $scheme . '://' . $host;
$verifyLink = $base . '/backend/api/user/verify_email_change.php?token=' . urlencode($token);
if ($origin !== '') {
    $verifyLink .= '&return_to=' . urlencode($origin);
}

$upd = $conn->prepare('UPDATE users SET pending_email = ?, email_change_token_hash = ?, email_change_expires_at = ? WHERE id = ?');
$upd->bind_param('sssi', $nextEmail, $tokenHash, $expiresAt, $userId);
if (!$upd->execute()) {
    send_error('Failed to start email change', 500);
}

$subject = 'Confirm your new email - Evermore';
$bodyHtml = '<p>Hi ' . htmlspecialchars($username !== '' ? $username : 'there') . ',</p>'
    . '<p>You requested to change your email address for your Evermore account.</p>'
    . '<p>Confirm your new email by clicking the link below:</p>'
    . '<p><a href="' . htmlspecialchars($verifyLink) . '">Confirm Email Change</a></p>'
    . '<p>If the button doesn\'t work, copy and paste this URL:</p>'
    . '<p>' . htmlspecialchars($verifyLink) . '</p>'
    . '<p>This link expires in 24 hours.</p>';
$bodyText = "Confirm your new email:\n$verifyLink\n\nThis link expires in 24 hours.";

$sent = send_email_html($nextEmail, $subject, $bodyHtml, $bodyText);

if (!$sent) {
    send_error('Could not send email change link. Please try again later.', 500);
}

send_success('We sent a confirmation link to your new email. Please verify to complete the change.', [
    'verification_sent' => true,
]);
