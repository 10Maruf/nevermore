<?php
/**
 * Remove from Cart API
 * Purpose: Remove an item from user's shopping cart
 * Method: DELETE
 * Body: JSON {cart_item_id}
 * Requires: Authorization header with token
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/validator.php';
require_once '../../utils/auth_helper.php';

// Only accept DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    send_error('Method not allowed. Use DELETE.', 405);
}

// Require authentication
$user = require_auth($conn);

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$validation = validate_required_fields($input, ['cart_item_id']);
if (!$validation['valid']) {
    send_error('Missing required fields: cart_item_id');
}

$cart_item_id = intval($input['cart_item_id']);

// Verify cart item belongs to user
$stmt = $conn->prepare("
    SELECT sci.id 
    FROM shopping_cart_item sci
    INNER JOIN shopping_cart sc ON sci.cart_id = sc.id
    WHERE sci.id = ? AND sc.user_id = ?
");
$stmt->bind_param("ii", $cart_item_id, $user['id']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    send_error('Cart item not found or does not belong to you', 404);
}

// Delete cart item
$stmt = $conn->prepare("DELETE FROM shopping_cart_item WHERE id = ?");
$stmt->bind_param("i", $cart_item_id);

if ($stmt->execute()) {
    send_success('Item removed from cart successfully');
} else {
    send_error('Failed to remove item from cart', 500);
}

?>
