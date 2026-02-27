<?php
require_once '../../config/config.php';
require_once '../../utils/response.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get products by category slug or product ID
    $category_slug = isset($_GET['category']) ? $_GET['category'] : null;
    $product_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if ($product_id) {
        // Get single product with all variants
        $sql = "SELECT 
                    p.id, p.name, p.description, p.base_price, 
                    p.size_fit, p.care_maintenance,
                    c.slug as category_slug, c.name as category_name
                FROM products p
                INNER JOIN categories c ON p.category_id = c.id
                WHERE p.id = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $product_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            send_error('Product not found', 404);
            exit;
        }
        
        $product = $result->fetch_assoc();
        
        // Get variants with inventory and images
        $stmt = $conn->prepare("SELECT 
                                    pv.id as variant_id, pv.color, pv.color_code, pv.sku
                                FROM product_variants pv
                                WHERE pv.product_id = ?
                                ORDER BY pv.id");
        $stmt->bind_param("i", $product_id);
        $stmt->execute();
        $variants_result = $stmt->get_result();
        
        $variants = [];
        while ($variant = $variants_result->fetch_assoc()) {
            // Get inventory for this variant
            $stmt2 = $conn->prepare("SELECT size, quantity, reserved_quantity 
                                     FROM product_inventory 
                                     WHERE variant_id = ?
                                     ORDER BY FIELD(size, 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')");
            $stmt2->bind_param("i", $variant['variant_id']);
            $stmt2->execute();
            $inv_result = $stmt2->get_result();
            
            $inventory = [];
            while ($inv = $inv_result->fetch_assoc()) {
                $available = $inv['quantity'] - $inv['reserved_quantity'];
                $inventory[] = [
                    'size' => $inv['size'],
                    'quantity' => intval($inv['quantity']),
                    'available' => $available,
                    'in_stock' => $available > 0
                ];
            }
            
            // Get images for this variant
            $stmt2 = $conn->prepare("SELECT image_url, display_order, is_primary 
                                     FROM product_images 
                                     WHERE variant_id = ?
                                     ORDER BY display_order");
            $stmt2->bind_param("i", $variant['variant_id']);
            $stmt2->execute();
            $img_result = $stmt2->get_result();
            
            $images = [];
            while ($img = $img_result->fetch_assoc()) {
                $images[] = [
                    'url' => $img['image_url'],
                    'order' => intval($img['display_order']),
                    'is_primary' => (bool)$img['is_primary']
                ];
            }
            
            $variant['inventory'] = $inventory;
            $variant['images'] = $images;
            $variants[] = $variant;
        }
        
        $product['variants'] = $variants;
        send_success('Product retrieved successfully', ['product' => $product]);
        
    } else if ($category_slug) {
        // Get all products for a category - JOIN with categories table
        $sql = "SELECT 
                    p.id, p.name, p.base_price, 
                    c.slug as category_slug, c.name as category_name
                FROM products p
                INNER JOIN categories c ON p.category_id = c.id
                WHERE c.slug = ?
                GROUP BY p.id
                ORDER BY p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $category_slug);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $products = [];
        while ($row = $result->fetch_assoc()) {
            $product_id = $row['id'];
            
            // Get all variants for this product
            $stmt2 = $conn->prepare("SELECT 
                                        pv.id as variant_id, pv.color, pv.color_code
                                    FROM product_variants pv
                                    WHERE pv.product_id = ?");
            $stmt2->bind_param("i", $product_id);
            $stmt2->execute();
            $variants_result = $stmt2->get_result();
            
            $variants = [];
            while ($variant = $variants_result->fetch_assoc()) {
                // Get primary image
                $stmt3 = $conn->prepare("SELECT image_url 
                                        FROM product_images 
                                        WHERE variant_id = ? 
                                        ORDER BY is_primary DESC, display_order 
                                        LIMIT 1");
                $stmt3->bind_param("i", $variant['variant_id']);
                $stmt3->execute();
                $img_result = $stmt3->get_result();
                $img = $img_result->fetch_assoc();
                
                // Check if any size is in stock
                $stmt3 = $conn->prepare("SELECT SUM(quantity - reserved_quantity) as available 
                                        FROM product_inventory 
                                        WHERE variant_id = ?");
                $stmt3->bind_param("i", $variant['variant_id']);
                $stmt3->execute();
                $stock_result = $stmt3->get_result();
                $stock = $stock_result->fetch_assoc();
                
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
        
        send_success('Products retrieved successfully', ['products' => $products]);
        
    } else {
        send_error('Category or product ID required', 400);
    }
} else {
    send_error('Method not allowed', 405);
}
