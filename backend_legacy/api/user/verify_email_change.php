<?php
/**
 * Verify email change token
 * Method: GET
 * Query: token, optional return_to
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';

$token = isset($_GET['token']) ? trim((string)$_GET['token']) : '';
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

if ($token === '' || strlen($token) < 20) {
    header('Location: ' . $frontend_url . '/profile?email_changed=0');
    exit;
}

// Ensure required columns exist
foreach (['pending_email', 'email_change_token_hash', 'email_change_expires_at'] as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    if (!$col || $col->num_rows === 0) {
        header('Location: ' . $frontend_url . '/profile?email_changed=0');
        exit;
    }
}

$tokenHash = hash('sha256', $token);

$stmt = $conn->prepare('SELECT id, pending_email FROM users WHERE email_change_token_hash = ? AND email_change_expires_at > NOW() LIMIT 1');
$stmt->bind_param('s', $tokenHash);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    header('Location: ' . $frontend_url . '/profile?email_changed=0');
    exit;
}

$row = $res->fetch_assoc();
$userId = (int)$row['id'];
$pendingEmail = (string)($row['pending_email'] ?? '');

if ($pendingEmail === '') {
    header('Location: ' . $frontend_url . '/profile?email_changed=0');
    exit;
}

// Update email
$upd = $conn->prepare('UPDATE users SET email = ?, pending_email = NULL, email_change_token_hash = NULL, email_change_expires_at = NULL WHERE id = ?');
$upd->bind_param('si', $pendingEmail, $userId);
$upd->execute();

// If email_verified_at exists, keep user verified
$col = $conn->query("SHOW COLUMNS FROM users LIKE 'email_verified_at'");
if ($col && $col->num_rows > 0) {
    $stmt2 = $conn->prepare('UPDATE users SET email_verified_at = NOW() WHERE id = ?');
    $stmt2->bind_param('i', $userId);
    $stmt2->execute();
}

header('Location: ' . $frontend_url . '/profile?email_changed=1');
exit;
