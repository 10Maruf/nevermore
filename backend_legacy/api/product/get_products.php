<?php
/**
 * Get Products API
 * Purpose: Retrieve all active products with category information
 * Method: GET
 * Query Params: ?category_id=X (optional)
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed. Use GET.', 405);
}

// Build query
$query = "
    SELECT DISTINCT
        p.id as product_id,
        p.name as product_name,
        p.description,
        p.product_image,
        pc.id as category_id,
        pc.category_name,
        MIN(pi.price) as min_price,
        MAX(pi.price) as max_price,
        SUM(pi.qty_in_stock) as total_stock
    FROM product p
    LEFT JOIN product_category pc ON p.category_id = pc.id
    LEFT JOIN product_item pi ON p.id = pi.product_id
    WHERE 1=1
";

$params = [];
$types = "";

// Filter by category if provided
if (isset($_GET['category_id']) && !empty($_GET['category_id'])) {
    $query .= " AND pc.id = ?";
    $params[] = intval($_GET['category_id']);
    $types .= "i";
}

$query .= " GROUP BY p.id, p.name, p.description, p.product_image, pc.id, pc.category_name";
$query .= " ORDER BY p.id DESC";

// Prepare and execute query
if (!empty($params)) {
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query($query);
}

$products = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
}

send_success('Products retrieved successfully', [
    'count' => count($products),
    'products' => $products
]);

?>
