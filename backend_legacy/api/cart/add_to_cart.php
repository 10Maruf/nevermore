<?php
/**
 * Add to Cart API
 * Purpose: Add product item to user's shopping cart
 * Method: POST
 * Body: JSON {product_item_id, qty}
 * Requires: Authorization header with token
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/validator.php';
require_once '../../utils/auth_helper.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed. Use POST.', 405);
}

// Require authentication
$user = require_auth($conn);

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$validation = validate_required_fields($input, ['product_item_id', 'qty']);
if (!$validation['valid']) {
    send_error('Missing required fields: ' . implode(', ', $validation['missing']));
}

$product_item_id = intval($input['product_item_id']);
$qty = intval($input['qty']);

// Validate quantity
if ($qty <= 0) {
    send_error('Quantity must be greater than 0');
}

// Check if product item exists and has sufficient stock
$stmt = $conn->prepare("SELECT qty_in_stock, price FROM product_item WHERE id = ?");
$stmt->bind_param("i", $product_item_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    send_error('Product item not found');
}

$product_item = $result->fetch_assoc();

if ($product_item['qty_in_stock'] < $qty) {
    send_error('Insufficient stock. Available: ' . $product_item['qty_in_stock']);
}

// Get or create shopping cart for user
$stmt = $conn->prepare("SELECT id FROM shopping_cart WHERE user_id = ?");
$stmt->bind_param("i", $user['id']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $cart = $result->fetch_assoc();
    $cart_id = $cart['id'];
} else {
    // Create new cart
    $stmt = $conn->prepare("INSERT INTO shopping_cart (user_id) VALUES (?)");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $cart_id = $conn->insert_id;
}

// Check if item already in cart
$stmt = $conn->prepare("
    SELECT id, qty FROM shopping_cart_item 
    WHERE cart_id = ? AND product_item_id = ?
");
$stmt->bind_param("ii", $cart_id, $product_item_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Update existing cart item
    $cart_item = $result->fetch_assoc();
    $new_qty = $cart_item['qty'] + $qty;
    
    if ($product_item['qty_in_stock'] < $new_qty) {
        send_error('Cannot add more. Total would exceed available stock.');
    }
    
    $stmt = $conn->prepare("UPDATE shopping_cart_item SET qty = ? WHERE id = ?");
    $stmt->bind_param("ii", $new_qty, $cart_item['id']);
    $stmt->execute();
    
    send_success('Cart updated successfully', [
        'cart_item_id' => $cart_item['id'],
        'quantity' => $new_qty
    ]);
} else {
    // Add new cart item
    $stmt = $conn->prepare("
        INSERT INTO shopping_cart_item (cart_id, product_item_id, qty) 
        VALUES (?, ?, ?)
    ");
    $stmt->bind_param("iii", $cart_id, $product_item_id, $qty);
    
    if ($stmt->execute()) {
        send_success('Item added to cart successfully', [
            'cart_item_id' => $conn->insert_id,
            'quantity' => $qty
        ]);
    } else {
        send_error('Failed to add item to cart', 500);
    }
}

?>
