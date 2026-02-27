<?php
/**
 * Get Cart API
 * Purpose: Retrieve all items in user's shopping cart with product details
 * Method: GET
 * Requires: Authorization header with token
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/auth_helper.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed. Use GET.', 405);
}

// Require authentication
$user = require_auth($conn);

// Get user's cart
$stmt = $conn->prepare("
    SELECT 
        sci.id as cart_item_id,
        sci.qty,
        pi.id as product_item_id,
        pi.SKU,
        pi.price,
        pi.product_image,
        pi.qty_in_stock,
        p.id as product_id,
        p.name as product_name,
        p.description,
        vs.size_name,
        vc.color_name,
        (sci.qty * pi.price) as subtotal
    FROM shopping_cart sc
    INNER JOIN shopping_cart_item sci ON sc.id = sci.cart_id
    INNER JOIN product_item pi ON sci.product_item_id = pi.id
    INNER JOIN product p ON pi.product_id = p.id
    LEFT JOIN variation_option vo_size ON pi.id = vo_size.product_item_id
    LEFT JOIN variation vs ON vo_size.variation_id = vs.id AND vs.name = 'size'
    LEFT JOIN variation_option vo_color ON pi.id = vo_color.product_item_id
    LEFT JOIN variation vc ON vo_color.variation_id = vc.id AND vc.name = 'color'
    WHERE sc.user_id = ?
    ORDER BY sci.id DESC
");

$stmt->bind_param("i", $user['id']);
$stmt->execute();
$result = $stmt->get_result();

$cart_items = [];
$total = 0;

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $cart_items[] = $row;
        $total += $row['subtotal'];
    }
}

send_success('Cart retrieved successfully', [
    'count' => count($cart_items),
    'items' => $cart_items,
    'total' => $total
]);

?>
