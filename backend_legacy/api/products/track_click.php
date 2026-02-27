<?php
require_once '../../config/config.php';
require_once '../../utils/response.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    send_error('Method not allowed', 405);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    send_error('Invalid JSON body', 400);
}

$product_id = isset($payload['product_id']) ? intval($payload['product_id']) : 0;
if ($product_id <= 0) {
    send_error('product_id is required', 400);
}

// Increment popularity for today. This keeps data small and fast to query.
$sql = "INSERT INTO product_popularity_daily (product_id, date, clicks)
        VALUES (?, CURDATE(), 1)
        ON DUPLICATE KEY UPDATE clicks = clicks + 1";

try {
    $stmt = $conn->prepare($sql);
} catch (Throwable $e) {
    $stmt = false;
}

if (!$stmt) {
    send_error('Failed to prepare popularity update. Ensure product_popularity_daily table exists.', 500);
}

$stmt->bind_param('i', $product_id);
if (!$stmt->execute()) {
    send_error('Failed to record click', 500);
}

send_success('Click recorded', ['product_id' => $product_id]);

?>
