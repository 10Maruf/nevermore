<?php
/**
 * Popular Products API
 * Endpoint: GET /api/products/popular.php?limit=12&days=30
 */

require_once '../../config/config.php';
require_once '../../utils/response.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    send_error('Method not allowed', 405);
}

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 12;
$days = isset($_GET['days']) ? intval($_GET['days']) : 30;

if ($limit <= 0) $limit = 12;
if ($limit > 50) $limit = 50;
if ($days <= 0) $days = 30;
if ($days > 365) $days = 365;

$since = date('Y-m-d', strtotime('-' . $days . ' days'));

// 1) Get popular product IDs
$popularIds = [];

$pop_sql = "SELECT product_id, SUM(clicks) AS total_clicks
            FROM product_popularity_daily
            WHERE date >= ?
            GROUP BY product_id
            ORDER BY total_clicks DESC
            LIMIT ?";

try {
    $pop_stmt = $conn->prepare($pop_sql);
} catch (Throwable $e) {
    $pop_stmt = false;
}

if ($pop_stmt) {
    $pop_stmt->bind_param('si', $since, $limit);
    if ($pop_stmt->execute()) {
        $pop_result = $pop_stmt->get_result();
        while ($row = $pop_result->fetch_assoc()) {
            $popularIds[] = intval($row['product_id']);
        }
    }
}

// 2) If there are no tracked popular products yet, fall back to latest products
$products = [];

function load_variants_for_product($conn, $product_id) {
    $variants = [];
    try {
        $stmt2 = $conn->prepare("SELECT pv.id as variant_id, pv.color, pv.color_code
                                FROM product_variants pv
                                WHERE pv.product_id = ?");
    } catch (Throwable $e) {
        $stmt2 = false;
    }
    if (!$stmt2) {
        return $variants;
    }

    $stmt2->bind_param('i', $product_id);
    $stmt2->execute();
    $variants_result = $stmt2->get_result();

    while ($variant = $variants_result->fetch_assoc()) {
        // Primary image
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
            $stmt3->bind_param('i', $variant['variant_id']);
            $stmt3->execute();
            $img_result = $stmt3->get_result();
            $img = $img_result->fetch_assoc();
        }

        // Stock check
        $stock = ['available' => 0];
        try {
            $stmt4 = $conn->prepare("SELECT SUM(quantity - reserved_quantity) as available
                                    FROM product_inventory
                                    WHERE variant_id = ?");
        } catch (Throwable $e) {
            $stmt4 = false;
        }
        if ($stmt4) {
            $stmt4->bind_param('i', $variant['variant_id']);
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

    return $variants;
}

function load_product_row_by_id($conn, $product_id) {
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
                WHERE p.id = ?";

    $sql_fallback = "SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.base_price,
                    p.category_slug as category_slug,
                    p.category_slug as category_name,
                    NULL as parent_category
                FROM products p
                WHERE p.id = ?";

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
        return null;
    }

    $stmt->bind_param('i', $product_id);
    if (!$stmt->execute()) {
        return null;
    }

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    if (!$row) return null;

    // Ensure consistent keys for fallback schema
    if ($using_fallback) {
        if (!isset($row['category_slug'])) $row['category_slug'] = null;
        if (!isset($row['category_name'])) $row['category_name'] = $row['category_slug'];
    }

    return $row;
}

if (count($popularIds) > 0) {
    foreach ($popularIds as $pid) {
        $row = load_product_row_by_id($conn, $pid);
        if (!$row) continue;
        $row['variants'] = load_variants_for_product($conn, intval($row['id']));
        $products[] = $row;
    }
}

if (count($products) === 0) {
    // Fallback: latest products
    $latest_joined = "SELECT
                        p.id,
                        p.name,
                        p.description,
                        p.base_price,
                        c.slug as category_slug,
                        c.name as category_name,
                        NULL as parent_category
                    FROM products p
                    INNER JOIN categories c ON p.category_id = c.id
                    ORDER BY p.created_at DESC
                    LIMIT ?";

    $latest_fallback = "SELECT
                        p.id,
                        p.name,
                        p.description,
                        p.base_price,
                        p.category_slug as category_slug,
                        p.category_slug as category_name,
                        NULL as parent_category
                    FROM products p
                    ORDER BY p.created_at DESC
                    LIMIT ?";

    try {
        $stmt = $conn->prepare($latest_joined);
    } catch (Throwable $e) {
        $stmt = false;
    }
    if (!$stmt) {
        try {
            $stmt = $conn->prepare($latest_fallback);
        } catch (Throwable $e) {
            $stmt = false;
        }
    }

    if ($stmt) {
        $stmt->bind_param('i', $limit);
        if ($stmt->execute()) {
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $row['variants'] = load_variants_for_product($conn, intval($row['id']));
                $products[] = $row;
            }
        }
    }
}

send_success('Popular products retrieved successfully', [
    'products' => $products,
    'since' => $since,
    'days' => $days,
    'limit' => $limit
]);

?>
