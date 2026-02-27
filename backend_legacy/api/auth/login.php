<?php
/**
 * User Login API
 * Purpose: Authenticate users and generate session tokens
 * Method: POST
 * Body: JSON {email, password}
 * Returns: User data and authentication token
 */

// Enable CORS - production domains only
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

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/validator.php';
require_once '../../utils/auth_helper.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$validation = validate_required_fields($input, ['email', 'password']);
if (!$validation['valid']) {
    send_error('Missing required fields: ' . implode(', ', $validation['missing']));
}

$email = sanitize_string($input['email']);
$password = $input['password'];

// Get user from database (include role field)
$hasEmailVerifiedAt = false;
$col = $conn->query("SHOW COLUMNS FROM users LIKE 'email_verified_at'");
if ($col && $col->num_rows > 0) {
    $hasEmailVerifiedAt = true;
}

$selectSql = $hasEmailVerifiedAt
    ? "SELECT id, email, username, password, role, email_verified_at FROM users WHERE email = ?"
    : "SELECT id, email, username, password, role FROM users WHERE email = ?";

$stmt = $conn->prepare($selectSql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    send_error('Invalid email or password', 401);
}

$user = $result->fetch_assoc();

// Block login if email verification is enabled and user is not verified
if ($hasEmailVerifiedAt && empty($user['email_verified_at'])) {
    send_error('Please verify your email before logging in.', 403);
}

// Verify password
if (!verify_password($password, $user['password'])) {
    send_error('Invalid email or password', 401);
}

// Generate authentication token
$token = generate_token();
$expires_at = date('Y-m-d H:i:s', strtotime('+30 days')); // Token valid for 30 days

// Delete old sessions for this user
$stmt = $conn->prepare("DELETE FROM session WHERE user_id = ?");
$stmt->bind_param("i", $user['id']);
$stmt->execute();

// Create new session
$stmt = $conn->prepare("
    INSERT INTO session (user_id, token, expires_at, created_at) 
    VALUES (?, ?, ?, NOW())
");
$stmt->bind_param("iss", $user['id'], $token, $expires_at);

if ($stmt->execute()) {
    // Remove password from response
    unset($user['password']);
    
    send_success('Login successful', [
        'user' => $user,
        'token' => $token,
        'expires_at' => $expires_at
    ]);
} else {
    send_error('Failed to create session', 500);
}

?>
