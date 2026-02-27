<?php
/**
 * Get Product Variations API
 * Purpose: Retrieve all variations (sizes, colors, prices) for a specific product
 * Method: GET
 * Query Params: ?product_id=X (required)
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/validator.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed. Use GET.', 405);
}

// Validate product_id parameter
if (!isset($_GET['product_id']) || !validate_positive_int($_GET['product_id'])) {
    send_error('Valid product_id parameter is required');
}

$product_id = intval($_GET['product_id']);

// Get product variations
$stmt = $conn->prepare("
    SELECT 
        pi.id as variation_id,
        pi.product_id,
        pi.SKU,
        pi.qty_in_stock,
        pi.product_image,
        pi.price,
        vs.id as size_id,
        vs.size_name,
        vs.size_value,
        vc.id as color_id,
        vc.color_name,
        vc.color_value
    FROM product_item pi
    LEFT JOIN variation_option vo_size ON pi.id = vo_size.product_item_id
    LEFT JOIN variation vs ON vo_size.variation_id = vs.id AND vs.name = 'size'
    LEFT JOIN variation_option vo_color ON pi.id = vo_color.product_item_id
    LEFT JOIN variation vc ON vo_color.variation_id = vc.id AND vc.name = 'color'
    WHERE pi.product_id = ?
    ORDER BY vs.size_value, vc.color_name
");

$stmt->bind_param("i", $product_id);
$stmt->execute();
$result = $stmt->get_result();

$variations = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $variations[] = $row;
    }
    
    send_success('Product variations retrieved successfully', [
        'product_id' => $product_id,
        'count' => count($variations),
        'variations' => $variations
    ]);
} else {
    send_success('No variations found for this product', [
        'product_id' => $product_id,
        'count' => 0,
        'variations' => []
    ]);
}

?>
