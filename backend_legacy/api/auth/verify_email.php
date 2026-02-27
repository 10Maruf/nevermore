<?php
/**
 * Email Verification Endpoint
 * Purpose: Verify a user's email address via token
 * Method: GET
 * Query: ?token=...
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';

$token = isset($_GET['token']) ? trim((string)$_GET['token']) : '';
$wantJson = isset($_GET['json']) && (string)$_GET['json'] === '1';

// Optional: where to send user after verification (helps local dev ports like :5176)
$return_to = isset($_GET['return_to']) ? trim((string)$_GET['return_to']) : '';

$allowedHosts = ['evermorebrand.com', 'www.evermorebrand.com'];
$allowedSchemes = ['http', 'https'];

if ($return_to !== '') {
    $parts = @parse_url($return_to);
    $host = isset($parts['host']) ? strtolower((string)$parts['host']) : '';
    $scheme = isset($parts['scheme']) ? strtolower((string)$parts['scheme']) : '';
    if (!in_array($host, $allowedHosts, true) || !in_array($scheme, $allowedSchemes, true)) {
        $return_to = '';
    }
}

$frontend_url = getenv('FRONTEND_URL');
if (!$frontend_url) {
    $frontend_url = 'https://evermorebrand.com';
}
$frontend_url = rtrim($return_to !== '' ? $return_to : $frontend_url, '/');

if ($token === '') {
    if ($wantJson) {
        send_error('Missing verification token', 400);
    }
    header('Location: ' . $frontend_url . '/login?verified=0');
    exit;
}

// Ensure required columns exist
$needCols = ['email_verification_token', 'email_verification_expires_at', 'email_verified_at'];
foreach ($needCols as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    if (!$col || $col->num_rows === 0) {
        if ($wantJson) {
            send_error('Email verification is not configured in DB. Run the email verification migration SQL.', 500);
        }
        header('Location: ' . $frontend_url . '/login?verified=0');
        exit;
    }
}

// Find user by token (not expired)
$stmt = $conn->prepare("SELECT id FROM users WHERE email_verification_token = ? AND email_verification_expires_at > NOW() LIMIT 1");
$stmt->bind_param('s', $token);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    if ($wantJson) {
        send_error('Invalid or expired verification token', 400);
    }
    header('Location: ' . $frontend_url . '/login?verified=0');
    exit;
}

$row = $res->fetch_assoc();
$user_id = (int)$row['id'];

// Mark verified
$stmt = $conn->prepare("UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = ?");
$stmt->bind_param('i', $user_id);
$stmt->execute();

if ($wantJson) {
    send_success('Email verified successfully');
}

header('Location: ' . $frontend_url . '/login?verified=1');
exit;
?>
