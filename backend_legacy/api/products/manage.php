<?php
require_once '../../config/config.php';
require_once '../../utils/response.php';
require_once '../../utils/auth_helper.php';

// CORS Headers
header('Access-Control-Allow-Origin: https://evermorebrand.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication (robust across Apache/XAMPP header casing)
$user = verify_auth($conn);
if (!$user) {
    send_error('Unauthorized. Please login.', 401);
    exit;
}

if (($user['role'] ?? '') !== 'admin') {
    send_error('Admin access required', 403);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - Fetch all products
if ($method === 'GET') {
    $category_slug = isset($_GET['category']) ? $_GET['category'] : null;
    
    $sql = "SELECT 
                p.id, p.name, p.description, p.base_price,
                p.size_fit, p.care_maintenance,
                c.slug as category_slug, c.name as category_name,
                GROUP_CONCAT(DISTINCT pv.color ORDER BY pv.id) as colors,
                GROUP_CONCAT(DISTINCT pv.id ORDER BY pv.id) as variant_ids,
                SUM(pi.quantity) as total_quantity,
                p.created_at
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN product_inventory pi ON pv.id = pi.variant_id";
    
    if ($category_slug) {
        $sql .= " WHERE c.slug = ?";
    }
    
    $sql .= " GROUP BY p.id ORDER BY p.created_at DESC";
    
    if ($category_slug) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $category_slug);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql);
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $row['colors'] = $row['colors'] ? explode(',', $row['colors']) : [];
        $row['variant_ids'] = $row['variant_ids'] ? explode(',', $row['variant_ids']) : [];
        $products[] = $row;
    }
    
    send_success('Products retrieved successfully', ['products' => $products]);
}

// POST - Create new product
else if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($data['name'] ?? '');
    $category_slug = trim($data['category_slug'] ?? '');
    $description = trim($data['description'] ?? '');
    $base_price = floatval($data['base_price'] ?? 0);
    $color = trim($data['color'] ?? '');
    $color_code = trim($data['color_code'] ?? '');
    $sizes = $data['sizes'] ?? []; // Array of {size, quantity}
    $images = $data['images'] ?? []; // Array of image URLs
    $size_fit = trim($data['size_fit'] ?? '');
    $care_maintenance = trim($data['care_maintenance'] ?? '');
    
    if (empty($name) || empty($category_slug) || $base_price <= 0) {
        send_error('Product name, category, and price are required', 400);
        exit;
    }
    
    $conn->begin_transaction();
    
    try {
        // Get category_id from category_slug
        $stmt = $conn->prepare("SELECT id FROM categories WHERE slug = ?");
        $stmt->bind_param("s", $category_slug);
        $stmt->execute();
        $cat_result = $stmt->get_result();
        
        if ($cat_result->num_rows === 0) {
            throw new Exception("Invalid category slug: $category_slug");
        }
        
        $category = $cat_result->fetch_assoc();
        $category_id = $category['id'];
        
        // Check if product exists with same name and category
        $stmt = $conn->prepare("SELECT id FROM products WHERE name = ? AND category_id = ?");
        $stmt->bind_param("si", $name, $category_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // Product exists, get product_id
            $product = $result->fetch_assoc();
            $product_id = $product['id'];
        } else {
            // Create new product - only use category_id, NOT category_slug
            $stmt = $conn->prepare("INSERT INTO products (name, category_id, description, base_price, size_fit, care_maintenance) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sisdss", $name, $category_id, $description, $base_price, $size_fit, $care_maintenance);
            $stmt->execute();
            $product_id = $conn->insert_id;
        }
        
        // Create product variant (color)
        $sku = strtoupper(substr($name, 0, 3)) . '-' . ($color ? strtoupper(substr($color, 0, 3)) : 'DEF') . '-' . time();
        $stmt = $conn->prepare("INSERT INTO product_variants (product_id, color, color_code, sku) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $product_id, $color, $color_code, $sku);
        $stmt->execute();
        $variant_id = $conn->insert_id;
        
        // Add inventory for each size
        if (!empty($sizes)) {
            $stmt = $conn->prepare("INSERT INTO product_inventory (variant_id, size, quantity) VALUES (?, ?, ?)");
            foreach ($sizes as $size_data) {
                $size = $size_data['size'];
                $quantity = intval($size_data['quantity']);
                $stmt->bind_param("isi", $variant_id, $size, $quantity);
                $stmt->execute();
            }
        }
        
        // Add images with proper ordering
        if (!empty($images)) {
            $stmt = $conn->prepare("INSERT INTO product_images (variant_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)");
            foreach ($images as $image_data) {
                $image_url = is_array($image_data) ? $image_data['url'] : $image_data;
                $display_order = is_array($image_data) ? intval($image_data['order']) : array_search($image_data, $images);
                $is_primary = ($display_order === 0) ? 1 : 0;
                $stmt->bind_param("isii", $variant_id, $image_url, $display_order, $is_primary);
                $stmt->execute();
            }
        }
        
        $conn->commit();
        send_success('Product added successfully', ['product_id' => $product_id, 'variant_id' => $variant_id]);
        
    } catch (Exception $e) {
        $conn->rollback();
        send_error('Failed to create product: ' . $e->getMessage(), 500);
    }
}

// PUT - Update product
else if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $product_id = intval($data['product_id'] ?? 0);
    $name = trim($data['name'] ?? '');
    $category_slug = trim($data['category_slug'] ?? '');
    $description = isset($data['description']) ? trim($data['description']) : '';
    $base_price = floatval($data['base_price'] ?? 0);
    $color = trim($data['color'] ?? '');
    $sizes = $data['sizes'] ?? [];
    $images = $data['images'] ?? [];
    $size_fit = isset($data['size_fit']) ? trim($data['size_fit']) : '';
    $care_maintenance = isset($data['care_maintenance']) ? trim($data['care_maintenance']) : '';

    
    if ($product_id <= 0) {
        send_error('Product ID required', 400);
        exit;
    }

    // Support non-destructive price-only updates (used by Manage Pricing page).
    // If frontend sends only { product_id, base_price }, we should NOT require name/category
    // and we must NOT wipe inventory/images via the full-update flow.
    $hasOtherUpdateFields = (
        array_key_exists('name', $data) ||
        array_key_exists('category_slug', $data) ||
        array_key_exists('description', $data) ||
        array_key_exists('color', $data) ||
        array_key_exists('sizes', $data) ||
        array_key_exists('images', $data) ||
        array_key_exists('size_fit', $data) ||
        array_key_exists('care_maintenance', $data)
    );

    if (!$hasOtherUpdateFields) {
        if ($base_price <= 0) {
            send_error('Valid price is required', 400);
            exit;
        }

        try {
            $stmt = $conn->prepare('UPDATE products SET base_price = ? WHERE id = ?');
            $stmt->bind_param('di', $base_price, $product_id);
            $stmt->execute();

            if ($stmt->affected_rows === 0) {
                // Either product not found or same price as before.
                // Confirm product exists so we can return a helpful error.
                $stmtChk = $conn->prepare('SELECT id FROM products WHERE id = ?');
                $stmtChk->bind_param('i', $product_id);
                $stmtChk->execute();
                $resChk = $stmtChk->get_result();
                if (!$resChk || $resChk->num_rows === 0) {
                    send_error('Product not found', 404);
                    exit;
                }
            }

            send_success('Price updated successfully');
            exit;
        } catch (Throwable $e) {
            send_error('Failed to update price', 500);
            exit;
        }
    }
    
    if (empty($name) || empty($category_slug) || $base_price <= 0) {
        send_error('Product name, category, and price are required', 400);
        exit;
    }
    
    $conn->begin_transaction();
    
    try {
        // Get category_id from category_slug
        $stmt = $conn->prepare("SELECT id FROM categories WHERE slug = ?");
        $stmt->bind_param("s", $category_slug);
        $stmt->execute();
        $cat_result = $stmt->get_result();
        
        if ($cat_result->num_rows === 0) {
            throw new Exception("Invalid category slug: $category_slug");
        }
        
        $category = $cat_result->fetch_assoc();
        $category_id = $category['id'];
        
        // DEBUG: Log what we're about to update
        error_log("UPDATE - Product ID: $product_id");
        error_log("UPDATE - size_fit: '" . $size_fit . "' (length: " . strlen($size_fit) . ")");
        error_log("UPDATE - care_maintenance: '" . $care_maintenance . "' (length: " . strlen($care_maintenance) . ")");
        error_log("UPDATE - description: '" . $description . "' (length: " . strlen($description) . ")");
        
        // Update product base info
        $stmt = $conn->prepare("UPDATE products SET name = ?, category_id = ?, description = ?, base_price = ?, size_fit = ?, care_maintenance = ? WHERE id = ?");
        $stmt->bind_param("sisdssi", $name, $category_id, $description, $base_price, $size_fit, $care_maintenance, $product_id);
        $stmt->execute();
        
        // Check if variant_id is provided (editing specific variant)
        $variant_id = isset($data['variant_id']) ? intval($data['variant_id']) : null;
        
        if ($variant_id) {
            // Verify this variant belongs to this product
            $stmt = $conn->prepare("SELECT id FROM product_variants WHERE id = ? AND product_id = ?");
            $stmt->bind_param("ii", $variant_id, $product_id);
            $stmt->execute();
            $variant_result = $stmt->get_result();
            
            if ($variant_result->num_rows === 0) {
                throw new Exception("Invalid variant ID for this product");
            }
        } else {
            // No variant_id provided, get the first variant for this product
            $stmt = $conn->prepare("SELECT id FROM product_variants WHERE product_id = ? LIMIT 1");
            $stmt->bind_param("i", $product_id);
            $stmt->execute();
            $variant_result = $stmt->get_result();
            
            if ($variant_result->num_rows > 0) {
                $variant = $variant_result->fetch_assoc();
                $variant_id = $variant['id'];
            }
        }
        
        if ($variant_id) {
            // Update existing variant
            
            // Update variant color
            $stmt = $conn->prepare("UPDATE product_variants SET color = ? WHERE id = ?");
            $stmt->bind_param("si", $color, $variant_id);
            $stmt->execute();
            
            // Delete old inventory
            $stmt = $conn->prepare("DELETE FROM product_inventory WHERE variant_id = ?");
            $stmt->bind_param("i", $variant_id);
            $stmt->execute();
            
            // Add new inventory
            if (!empty($sizes)) {
                $stmt = $conn->prepare("INSERT INTO product_inventory (variant_id, size, quantity) VALUES (?, ?, ?)");
                foreach ($sizes as $size_data) {
                    $size = $size_data['size'];
                    $quantity = intval($size_data['quantity']);
                    $stmt->bind_param("isi", $variant_id, $size, $quantity);
                    $stmt->execute();
                }
            }
            
            // Delete old images
            $stmt = $conn->prepare("DELETE FROM product_images WHERE variant_id = ?");
            $stmt->bind_param("i", $variant_id);
            $stmt->execute();
            
            // Add new images with proper ordering
            if (!empty($images)) {
                $stmt = $conn->prepare("INSERT INTO product_images (variant_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)");
                foreach ($images as $image_data) {
                    $image_url = is_array($image_data) ? $image_data['url'] : $image_data;
                    $display_order = is_array($image_data) ? intval($image_data['order']) : array_search($image_data, $images);
                    $is_primary = ($display_order === 0) ? 1 : 0;
                    $stmt->bind_param("isii", $variant_id, $image_url, $display_order, $is_primary);
                    $stmt->execute();
                }
            }
        } else {
            // No variant exists, create new one
            $sku = strtoupper(substr($name, 0, 3)) . '-' . ($color ? strtoupper(substr($color, 0, 3)) : 'DEF') . '-' . time();
            $stmt = $conn->prepare("INSERT INTO product_variants (product_id, color, sku) VALUES (?, ?, ?)");
            $stmt->bind_param("iss", $product_id, $color, $sku);
            $stmt->execute();
            $variant_id = $conn->insert_id;
            
            // Add inventory
            if (!empty($sizes)) {
                $stmt = $conn->prepare("INSERT INTO product_inventory (variant_id, size, quantity) VALUES (?, ?, ?)");
                foreach ($sizes as $size_data) {
                    $size = $size_data['size'];
                    $quantity = intval($size_data['quantity']);
                    $stmt->bind_param("isi", $variant_id, $size, $quantity);
                    $stmt->execute();
                }
            }
            
            // Add images with proper ordering
            if (!empty($images)) {
                $stmt = $conn->prepare("INSERT INTO product_images (variant_id, image_url, display_order, is_primary) VALUES (?, ?, ?, ?)");
                foreach ($images as $image_data) {
                    $image_url = is_array($image_data) ? $image_data['url'] : $image_data;
                    $display_order = is_array($image_data) ? intval($image_data['order']) : array_search($image_data, $images);
                    $is_primary = ($display_order === 0) ? 1 : 0;
                    $stmt->bind_param("isii", $variant_id, $image_url, $display_order, $is_primary);
                    $stmt->execute();
                }
            }
        }
        
        $conn->commit();
        send_success('Product updated successfully');
        
    } catch (Exception $e) {
        $conn->rollback();
        send_error('Failed to update product: ' . $e->getMessage(), 500);
    }
}

// DELETE - Delete product or variant
else if ($method === 'DELETE') {
    $variant_id = intval($_GET['variant_id'] ?? 0);
    $product_id = intval($_GET['product_id'] ?? 0);
    
    // Delete entire product (all variants)
    if ($product_id > 0) {
        try {
            $conn->begin_transaction();
            
            // Get all variant IDs for this product
            $stmt = $conn->prepare("SELECT id FROM product_variants WHERE product_id = ?");
            $stmt->bind_param("i", $product_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $variant_ids = [];
            while ($row = $result->fetch_assoc()) {
                $variant_ids[] = $row['id'];
            }
            
            if (!empty($variant_ids)) {
                $ids_placeholder = implode(',', array_fill(0, count($variant_ids), '?'));
                
                // Delete inventory
                $stmt = $conn->prepare("DELETE FROM product_inventory WHERE variant_id IN ($ids_placeholder)");
                $stmt->bind_param(str_repeat('i', count($variant_ids)), ...$variant_ids);
                $stmt->execute();
                
                // Delete images
                $stmt = $conn->prepare("DELETE FROM product_images WHERE variant_id IN ($ids_placeholder)");
                $stmt->bind_param(str_repeat('i', count($variant_ids)), ...$variant_ids);
                $stmt->execute();
                
                // Delete variants
                $stmt = $conn->prepare("DELETE FROM product_variants WHERE product_id = ?");
                $stmt->bind_param("i", $product_id);
                $stmt->execute();
            }
            
            // Delete the product itself
            $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
            $stmt->bind_param("i", $product_id);
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $conn->commit();
                send_success('Product deleted successfully');
            } else {
                $conn->rollback();
                send_error('Product not found', 404);
            }
        } catch (Exception $e) {
            $conn->rollback();
            send_error('Failed to delete product: ' . $e->getMessage(), 500);
        }
    }
    // Delete single variant
    else if ($variant_id > 0) {
        try {
            $conn->begin_transaction();
            
            // Delete inventory first
            $stmt = $conn->prepare("DELETE FROM product_inventory WHERE variant_id = ?");
            $stmt->bind_param("i", $variant_id);
            $stmt->execute();
            
            // Delete images
            $stmt = $conn->prepare("DELETE FROM product_images WHERE variant_id = ?");
            $stmt->bind_param("i", $variant_id);
            $stmt->execute();
            
            // Delete the variant
            $stmt = $conn->prepare("DELETE FROM product_variants WHERE id = ?");
            $stmt->bind_param("i", $variant_id);
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $conn->commit();
                send_success('Product variant deleted successfully');
            } else {
                $conn->rollback();
                send_error('Variant not found', 404);
            }
        } catch (Exception $e) {
            $conn->rollback();
            send_error('Failed to delete variant: ' . $e->getMessage(), 500);
        }
    } else {
        send_error('Product ID or Variant ID required', 400);
    }
}

else {
    send_error('Method not allowed', 405);
}
