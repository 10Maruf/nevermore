<?php
/**
 * User Registration API
 * Purpose: Register new users with email, username, and password
 * Method: POST
 * Body: JSON {email, username, password}
 */

// Enable CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/validator.php';
require_once '../../utils/auth_helper.php';
require_once '../../utils/mailer.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Check if JSON decode was successful
if ($input === null) {
    send_error('Invalid JSON format');
}

// Validate required fields
$validation = validate_required_fields($input, ['email', 'username', 'password']);
if (!$validation['valid']) {
    send_error('Missing required fields: ' . implode(', ', $validation['missing']));
}

$email = sanitize_string($input['email']);
$username = sanitize_string($input['username']);
$password = $input['password'];

// Validate email format
if (!validate_email($email)) {
    send_error('Invalid email format');
}

// Validate password strength
$password_check = validate_password($password);
if (!$password_check['valid']) {
    send_error($password_check['message']);
}

// Ensure required columns exist for email verification
$needCols = ['email_verification_token', 'email_verification_expires_at', 'email_verified_at'];
foreach ($needCols as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    if (!$col || $col->num_rows === 0) {
        send_error('Email verification is not configured in DB. Please run the email verification migration SQL in cPanel phpMyAdmin.', 500);
    }
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id, username, email_verified_at FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$existingRes = $stmt->get_result();

// If the email exists:
// - if verified => block signup, ask user to login
// - if not verified => resend verification link (do NOT change password/username)
if ($existingRes && $existingRes->num_rows > 0) {
    $existing = $existingRes->fetch_assoc();
    $existingId = (int)$existing['id'];
    $existingUsername = (string)($existing['username'] ?? '');
    $verifiedAt = $existing['email_verified_at'] ?? null;

    if (!empty($verifiedAt)) {
        send_error('Email already registered. Please login.', 400);
    }

    // Generate new verification token
    $verification_token = bin2hex(random_bytes(32));
    $verification_expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // Build verification link (include return_to so verify redirects back to correct frontend port)
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'evermorebrand.com';
    $base = $scheme . '://' . $host;
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim((string)$_SERVER['HTTP_ORIGIN']) : '';
    $verify_link = $base . '/backend/api/auth/verify_email.php?token=' . urlencode($verification_token);
    if ($origin !== '') {
        $verify_link .= '&return_to=' . urlencode($origin);
    }

    // Update token + expiry (keep existing username/password intact)
    $upd = $conn->prepare("UPDATE users SET email_verification_token = ?, email_verification_expires_at = ? WHERE id = ?");
    $upd->bind_param('ssi', $verification_token, $verification_expires_at, $existingId);
    $upd->execute();

    $useName = $existingUsername !== '' ? $existingUsername : $username;
    $subject = 'Verify your email - Evermore';
    $bodyHtml = '<p>Hi ' . htmlspecialchars($useName) . ',</p>'
        . '<p>Your account exists but is not verified yet. Please verify your email by clicking the link below:</p>'
        . '<p><a href="' . htmlspecialchars($verify_link) . '">Verify Email</a></p>'
        . '<p>If the button doesn\'t work, copy and paste this URL:</p>'
        . '<p>' . htmlspecialchars($verify_link) . '</p>'
        . '<p>This link expires in 24 hours.</p>';
    $bodyText = "Hi $useName,\n\nVerify your email:\n$verify_link\n\nThis link expires in 24 hours.";

    $sent = send_email_html($email, $subject, $bodyHtml, $bodyText);

    if (!$sent) {
        send_error('Account exists but verification email could not be sent. Please try again later.', 500);
    }

    send_success('Account already exists. We sent you a new verification email. Please check your inbox.', [
        'user_id' => $existingId,
        'email' => $email,
        'username' => $useName,
        'verification_sent' => true
    ]);
}

// Check if username already exists (only for new registrations)
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    send_error('Username already taken');
}

// Hash password
$hashed_password = hash_password($password);

// Generate verification token
$verification_token = bin2hex(random_bytes(32)); // 64 chars
$verification_expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

// Build verification link
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'evermorebrand.com';
$base = $scheme . '://' . $host;
$verify_link = $base . '/backend/api/auth/verify_email.php?token=' . urlencode($verification_token);
if ($origin !== '') {
    $verify_link .= '&return_to=' . urlencode($origin);
}

// Insert new user (unverified until email link clicked)
$stmt = $conn->prepare("
    INSERT INTO users (email, username, password, email_verified_at, email_verification_token, email_verification_expires_at, created_at)
    VALUES (?, ?, ?, NULL, ?, ?, NOW())
");
$stmt->bind_param("sssss", $email, $username, $hashed_password, $verification_token, $verification_expires_at);

if ($stmt->execute()) {
    $user_id = $conn->insert_id;

    $subject = 'Verify your email - Evermore';
    $bodyHtml = '<p>Hi ' . htmlspecialchars($username) . ',</p>'
        . '<p>Thanks for signing up. Please verify your email by clicking the link below:</p>'
        . '<p><a href="' . htmlspecialchars($verify_link) . '">Verify Email</a></p>'
        //. '<p>If the button doesn\'t work, copy and paste this URL:</p>'
        //. '<p>' . htmlspecialchars($verify_link) . '</p>'
        //. '<p>This link expires in 24 hours.</p>'
        ;
    $bodyText = "Hi $username,\n\nVerify your email:\n$verify_link\n\nThis link expires in 24 hours.";

    $sent = send_email_html($email, $subject, $bodyHtml, $bodyText);

    if (!$sent) {
        // Roll back user if email sending failed (prevents stuck unverified accounts)
        $del = $conn->prepare('DELETE FROM users WHERE id = ?');
        $del->bind_param('i', $user_id);
        $del->execute();
        send_error('Could not send verification email. Please try again later.', 500);
    }

    send_success('Registration successful. Please check your email and verify your account.', [
        'user_id' => $user_id,
        'email' => $email,
        'username' => $username,
        'verification_sent' => true
    ]);
} else {
    send_error('Registration failed: ' . $conn->error, 500);
}
?>
