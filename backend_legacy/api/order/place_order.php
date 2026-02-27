<?php
/**
 * Place Order API
 * Purpose: Create order from cart items, update stock, clear cart
 * Method: POST
 * Body: JSON {shipping_address_id, payment_method_id}
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
$validation = validate_required_fields($input, ['shipping_address_id', 'payment_method_id']);
if (!$validation['valid']) {
    send_error('Missing required fields: ' . implode(', ', $validation['missing']));
}

$shipping_address_id = intval($input['shipping_address_id']);
$payment_method_id = intval($input['payment_method_id']);

// Start transaction
$conn->begin_transaction();

try {
    // Get cart items
    $stmt = $conn->prepare("
        SELECT 
            sci.id as cart_item_id,
            sci.qty,
            pi.id as product_item_id,
            pi.price,
            pi.qty_in_stock
        FROM shopping_cart sc
        INNER JOIN shopping_cart_item sci ON sc.id = sci.cart_id
        INNER JOIN product_item pi ON sci.product_item_id = pi.id
        WHERE sc.user_id = ?
    ");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Cart is empty');
    }
    
    $cart_items = [];
    $order_total = 0;
    
    while ($row = $result->fetch_assoc()) {
        // Check stock availability
        if ($row['qty_in_stock'] < $row['qty']) {
            throw new Exception('Insufficient stock for product item ID: ' . $row['product_item_id']);
        }
        
        $cart_items[] = $row;
        $order_total += ($row['price'] * $row['qty']);
    }
    
    // Create order
    $order_date = date('Y-m-d H:i:s');
    $stmt = $conn->prepare("
        INSERT INTO shop_order (user_id, order_date, payment_method_id, shipping_address_id, order_total, order_status) 
        VALUES (?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->bind_param("isiid", $user['id'], $order_date, $payment_method_id, $shipping_address_id, $order_total);
    $stmt->execute();
    $order_id = $conn->insert_id;
    
    // Create order lines and update stock
    foreach ($cart_items as $item) {
        // Insert order line
        $stmt = $conn->prepare("
            INSERT INTO order_line (product_item_id, order_id, qty, price) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("iiid", $item['product_item_id'], $order_id, $item['qty'], $item['price']);
        $stmt->execute();
        
        // Decrease stock
        $new_stock = $item['qty_in_stock'] - $item['qty'];
        $stmt = $conn->prepare("UPDATE product_item SET qty_in_stock = ? WHERE id = ?");
        $stmt->bind_param("ii", $new_stock, $item['product_item_id']);
        $stmt->execute();
    }
    
    // Clear cart
    $stmt = $conn->prepare("
        DELETE sci FROM shopping_cart_item sci
        INNER JOIN shopping_cart sc ON sci.cart_id = sc.id
        WHERE sc.user_id = ?
    ");
    $stmt->bind_param("i", $user['id']);
    $stmt->execute();
    
    // Commit transaction
    $conn->commit();
    
    send_success('Order placed successfully', [
        'order_id' => $order_id,
        'order_total' => $order_total,
        'items_count' => count($cart_items),
        'order_date' => $order_date
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    send_error('Failed to place order: ' . $e->getMessage(), 500);
}

?>
