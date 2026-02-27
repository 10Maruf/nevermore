<?php
/**
 * My Orders API
 * Method: GET
 * Auth: Bearer token
 * Returns orders for the currently authenticated user.
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
header('Content-Type: application/json; charset=utf-8');

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

$status = isset($_GET['status']) ? (string)$_GET['status'] : 'all';
$allowedStatus = ['all', 'pending', 'processing', 'completed', 'cancelled'];
if (!in_array($status, $allowedStatus, true)) {
    send_error('Invalid status filter', 400);
}

$sql = 'SELECT * FROM orders WHERE user_id = ?';
$params = [$userId];
$types = 'i';

if ($status !== 'all') {
    $sql .= ' AND status = ?';
    $params[] = $status;
    $types .= 's';
}

$sql .= ' ORDER BY created_at DESC';

$stmt = $conn->prepare($sql);
if (!$stmt) {
    send_error('Failed to prepare query', 500);
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$orders = [];
if ($res) {
    while ($row = $res->fetch_assoc()) {
        // Decode JSON items if present
        if (isset($row['items']) && is_string($row['items'])) {
            $decoded = json_decode($row['items'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $row['items'] = $decoded;
            }
        }
        $orders[] = $row;
    }
}

send_success('Orders loaded', $orders);
