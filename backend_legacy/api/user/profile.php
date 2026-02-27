<?php
/**
 * Get current user's profile
 * Method: GET
 * Auth: Bearer token
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed. Use GET.', 405);
}

$authUser = require_auth($conn);
$userId = (int)$authUser['id'];

// Detect optional columns (so it works even before migration)
$cols = [
    'first_name' => false,
    'last_name' => false,
    'pending_email' => false,
];
foreach (array_keys($cols) as $colName) {
    $col = $conn->query("SHOW COLUMNS FROM users LIKE '" . $conn->real_escape_string($colName) . "'");
    $cols[$colName] = ($col && $col->num_rows > 0);
}

$select = 'id, email, username, role';
if ($cols['first_name']) $select .= ', first_name';
if ($cols['last_name']) $select .= ', last_name';
if ($cols['pending_email']) $select .= ', pending_email';

$stmt = $conn->prepare('SELECT ' . $select . ' FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    send_error('User not found', 404);
}

$row = $res->fetch_assoc();

$first = $cols['first_name'] ? (string)($row['first_name'] ?? '') : '';
$last = $cols['last_name'] ? (string)($row['last_name'] ?? '') : '';
if ($first === '' && $last === '') {
    // Back-compat: fall back to username
    $first = (string)($row['username'] ?? '');
    $last = '';
}

send_success('Profile loaded', [
    'id' => (int)$row['id'],
    'email' => (string)($row['email'] ?? ''),
    'username' => (string)($row['username'] ?? ''),
    'role' => (string)($row['role'] ?? 'user'),
    'first_name' => $first,
    'last_name' => $last,
    'pending_email' => $cols['pending_email'] ? (string)($row['pending_email'] ?? '') : '',
]);
