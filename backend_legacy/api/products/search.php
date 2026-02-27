<?php
/**
 * Product Search API
 * Endpoint: GET /api/products/search.php?q={search_term}
 * Searches products by name and description
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';

// CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'https://evermorebrand.com',
    'http://evermorebrand.com',
];
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get search query
    $search_query = isset($_GET['q']) ? trim($_GET['q']) : '';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    // Validate search query
    if (empty($search_query)) {
        send_error('Search query is required', 400);
        exit;
    }
    
    // Minimum search length
    if (strlen($search_query) < 2) {
        send_error('Search query must be at least 2 characters', 400);
        exit;
    }
    
    // Sanitize and prepare search term for LIKE query
    $search_term = '%' . $conn->real_escape_string($search_query) . '%';
    
    // Search products by name and description.
    // The repo contains two schema variants:
    // 1) products.category_id + categories table
    // 2) products.category_slug (no categories join)
    // Try the joined query first; if prepare fails, fall back to category_slug.
    $sql_joined = "SELECT 
                p.id, 
                p.name, 
                p.description,
                p.base_price, 
                c.slug as category_slug, 
                c.name as category_name,
                NULL as parent_category
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            WHERE p.name LIKE ? OR p.description LIKE ?
            ORDER BY 
                CASE 
                    WHEN p.name LIKE ? THEN 1 
                    ELSE 2 
                END,
                p.name ASC
            LIMIT ? OFFSET ?";

    $sql_fallback = "SELECT 
                p.id, 
                p.name, 
                p.description,
                p.base_price,
                p.category_slug as category_slug,
                p.category_slug as category_name,
                NULL as parent_category
            FROM products p
            WHERE p.name LIKE ? OR p.description LIKE ?
            ORDER BY 
                CASE 
                    WHEN p.name LIKE ? THEN 1 
                    ELSE 2 
                END,
                p.name ASC
            LIMIT ? OFFSET ?";

    try {
        $stmt = $conn->prepare($sql_joined);
    } catch (Throwable $e) {
        $stmt = false;
    }
    $using_fallback = false;
    if (!$stmt) {
        try {
            $stmt = $conn->prepare($sql_fallback);
        } catch (Throwable $e) {
            $stmt = false;
        }
        $using_fallback = true;
    }

    if (!$stmt) {
        send_error('Search query failed to prepare', 500);
        exit;
    }

    $exact_match = '%' . $conn->real_escape_string($search_query) . '%';
    $stmt->bind_param("sssii", $search_term, $search_term, $exact_match, $limit, $offset);
    if (!$stmt->execute()) {
        send_error('Search query failed to execute', 500);
        exit;
    }
    $result = $stmt->get_result();
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $product_id = $row['id'];
        
        // Get all variants for this product
        try {
            $stmt2 = $conn->prepare("SELECT 
                                        pv.id as variant_id, pv.color, pv.color_code
                                    FROM product_variants pv
                                    WHERE pv.product_id = ?");
        } catch (Throwable $e) {
            $stmt2 = false;
        }
        if (!$stmt2) {
            // If variants table doesn't exist or schema mismatch, still return products.
            $row['variants'] = [];
            $products[] = $row;
            continue;
        }
        $stmt2->bind_param("i", $product_id);
        $stmt2->execute();
        $variants_result = $stmt2->get_result();
        
        $variants = [];
        while ($variant = $variants_result->fetch_assoc()) {
            // Get primary image
            $img = null;
            try {
                $stmt3 = $conn->prepare("SELECT image_url 
                                        FROM product_images 
                                        WHERE variant_id = ? 
                                        ORDER BY is_primary DESC, display_order 
                                        LIMIT 1");
            } catch (Throwable $e) {
                $stmt3 = false;
            }
            if ($stmt3) {
                $stmt3->bind_param("i", $variant['variant_id']);
                $stmt3->execute();
                $img_result = $stmt3->get_result();
                $img = $img_result->fetch_assoc();
            }
            
            // Check if any size is in stock
            $stock = ['available' => 0];
            try {
                $stmt4 = $conn->prepare("SELECT SUM(quantity - reserved_quantity) as available 
                                        FROM product_inventory 
                                        WHERE variant_id = ?");
            } catch (Throwable $e) {
                $stmt4 = false;
            }
            if ($stmt4) {
                $stmt4->bind_param("i", $variant['variant_id']);
                $stmt4->execute();
                $stock_result = $stmt4->get_result();
                $stock = $stock_result->fetch_assoc() ?: ['available' => 0];
            }
            
            $variants[] = [
                'variant_id' => $variant['variant_id'],
                'color' => $variant['color'],
                'color_code' => $variant['color_code'],
                'image' => $img ? $img['image_url'] : null,
                'in_stock' => ($stock['available'] ?? 0) > 0
            ];
        }
        
        $row['variants'] = $variants;
        $products[] = $row;
    }
    
    // Get total count for pagination
    if ($using_fallback) {
        $count_sql = "SELECT COUNT(*) as total 
                      FROM products p
                      WHERE p.name LIKE ? OR p.description LIKE ?";
    } else {
        $count_sql = "SELECT COUNT(*) as total 
                      FROM products p
                      INNER JOIN categories c ON p.category_id = c.id
                      WHERE p.name LIKE ? OR p.description LIKE ?";
    }
    try {
        $count_stmt = $conn->prepare($count_sql);
    } catch (Throwable $e) {
        $count_stmt = false;
    }
    if (!$count_stmt) {
        send_success('Search completed successfully', [
            'products' => $products,
            'query' => $search_query,
            'total' => count($products),
            'limit' => $limit,
            'offset' => $offset
        ]);
        exit;
    }
    $count_stmt->bind_param("ss", $search_term, $search_term);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_row = $count_result->fetch_assoc();
    $total_count = $total_row ? $total_row['total'] : count($products);
    
    send_success('Search completed successfully', [
        'products' => $products,
        'query' => $search_query,
        'total' => intval($total_count),
        'limit' => $limit,
        'offset' => $offset
    ]);
    
} else {
    send_error('Method not allowed', 405);
}
