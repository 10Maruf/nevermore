<?php
/**
 * Orders API
 * Handles order creation and retrieval
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in output
ini_set('log_errors', 1);

// CORS Headers - MUST be first
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['https://evermorebrand.com', 'http://evermorebrand.com'];
if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Fallback for production
    header('Access-Control-Allow-Origin: https://evermorebrand.com');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Use centralized database configuration
require_once '../../config/config.php';

// Create PDO connection from mysqli connection details
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - Retrieve orders
if ($method === 'GET') {
    try {
        $status = $_GET['status'] ?? 'all';
        $userId = $_GET['user_id'] ?? null;
        
        $sql = "SELECT * FROM orders WHERE 1=1";
        $params = [];
        
        if ($status !== 'all') {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        
        if ($userId) {
            $sql .= " AND user_id = ?";
            $params[] = $userId;
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        // Decode JSON items for each order
        foreach ($orders as &$order) {
            $order['items'] = json_decode($order['items'], true);
        }
        
        echo json_encode([
            'status' => 'success',
            'data' => $orders
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// POST - Create new order
elseif ($method === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required = ['user_id', 'user_email', 'first_name', 'last_name', 'phone', 'address', 'city', 'country', 'items', 'subtotal', 'shipping_cost', 'total_amount'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }

        // Prevent empty orders
        if (!is_array($data['items']) || count($data['items']) === 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'You need to add product to order']);
            exit;
        }

        // Ensure at least one valid item with qty > 0
        $validCount = 0;
        foreach ($data['items'] as $it) {
            $qty = isset($it['qty']) ? (int)$it['qty'] : 0;
            $isCustom = isset($it['isCustom']) && $it['isCustom'] === true;
            $productId = $it['productId'] ?? null;

            if ($qty > 0 && ($isCustom || !empty($productId))) {
                $validCount++;
            }
        }
        if ($validCount === 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'You need to add product to order']);
            exit;
        }
        
        // Start transaction for order and inventory update
        $pdo->beginTransaction();
        
        // Check if order has custom designs and/or normal products
        $hasCustomDesign = false;
        $hasNormalProduct = false;
        
        foreach ($data['items'] as $item) {
            if (isset($item['isCustom']) && $item['isCustom'] === true) {
                $hasCustomDesign = true;
            } else {
                $hasNormalProduct = true;
            }
        }
        
        // Generate unique order ID with prefix based on order type
        // MD = Mixed (both custom and normal)
        // CD = Custom Design only
        // ORD = Normal products only
        if ($hasCustomDesign && $hasNormalProduct) {
            $prefix = 'MD'; // Mixed order
        } elseif ($hasCustomDesign) {
            $prefix = 'CD'; // Custom design only
        } else {
            $prefix = 'ORD'; // Normal products only
        }
        $orderId = $prefix . '-' . strtoupper(uniqid());
        
        $sql = "INSERT INTO orders (
            order_id, user_id, user_email, first_name, last_name, company, phone,
            address, apartment, city, postal_code, country,
            items, subtotal, discount_code, discount_amount, shipping_cost, total_amount,
            payment_method, shipping_method, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $orderId,
            $data['user_id'],
            $data['user_email'],
            $data['first_name'],
            $data['last_name'],
            $data['company'] ?? null,
            $data['phone'],
            $data['address'],
            $data['apartment'] ?? null,
            $data['city'],
            $data['postal_code'] ?? null,
            $data['country'],
            json_encode($data['items']),
            $data['subtotal'],
            $data['discount_code'] ?? null,
            $data['discount_amount'] ?? 0,
            $data['shipping_cost'],
            $data['total_amount'],
            $data['payment_method'] ?? 'cod',
            $data['shipping_method'] ?? 'standard'
        ]);
        
        // If discount code was used, increment its usage count
        if (!empty($data['discount_code'])) {
            $discountStmt = $pdo->prepare("UPDATE discount_codes SET current_uses = current_uses + 1 WHERE code = ?");
            $discountStmt->execute([$data['discount_code']]);
        }
        
        // Update inventory for each item in the order
        foreach ($data['items'] as $item) {
            // Extract product details
            $productId = $item['productId'] ?? null;
            $size = $item['size'] ?? null;
            $color = $item['color'] ?? null;
            $quantity = $item['qty'] ?? 0;
            
            if (!$productId || !$size || $quantity <= 0) {
                continue; // Skip invalid items
            }
            
            // Map display size names to database size codes
            $sizeMapping = [
                'X-SMALL' => 'XS',
                'SMALL' => 'S',
                'MEDIUM' => 'M',
                'LARGE' => 'L',
                'X-LARGE' => 'XL',
                'XXL' => 'XXL',
                'XXXL' => 'XXXL'
            ];
            
            // Convert size to database format
            $dbSize = $sizeMapping[$size] ?? $size;
            
            // Find the variant matching this product and color
            $variantSql = "SELECT v.id as variant_id 
                          FROM product_variants v 
                          WHERE v.product_id = ?";
            $variantParams = [$productId];
            
            // Add color filter if color is specified
            if ($color) {
                $variantSql .= " AND v.color = ?";
                $variantParams[] = $color;
            }
            
            $variantStmt = $pdo->prepare($variantSql);
            $variantStmt->execute($variantParams);
            $variants = $variantStmt->fetchAll();
            
            // For each variant, try to find the matching size in inventory
            $inventoryUpdated = false;
            foreach ($variants as $variant) {
                $variantId = $variant['variant_id'];
                
                // Check and update inventory using mapped size
                $invCheckSql = "SELECT id, quantity FROM product_inventory 
                               WHERE variant_id = ? AND size = ?";
                $invCheckStmt = $pdo->prepare($invCheckSql);
                $invCheckStmt->execute([$variantId, $dbSize]);
                $inventory = $invCheckStmt->fetch();
                
                if ($inventory) {
                    $currentQty = $inventory['quantity'];
                    
                    // Check if enough stock
                    if ($currentQty < $quantity) {
                        throw new Exception("Insufficient stock for product {$productId}, size {$size}, color {$color}");
                    }
                    
                    // Decrease inventory
                    $newQty = $currentQty - $quantity;
                    $updateInvSql = "UPDATE product_inventory 
                                    SET quantity = ? 
                                    WHERE id = ?";
                    $updateInvStmt = $pdo->prepare($updateInvSql);
                    $updateInvStmt->execute([$newQty, $inventory['id']]);
                    
                    // Successfully updated this variant's inventory
                    $inventoryUpdated = true;
                    break;
                }
            }
            
            // Log if inventory was not found/updated
            if (!$inventoryUpdated) {
                error_log("Warning: Could not update inventory for product {$productId}, size {$size}, color {$color}");
            }
        }
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Order created successfully',
            'data' => ['order_id' => $orderId]
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if (http_response_code() === 200) {
            http_response_code(500);
        }
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// PUT - Update order status
elseif ($method === 'PUT') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['order_id']) || !isset($data['status'])) {
            throw new Exception('Missing order_id or status');
        }
        
        $validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        if (!in_array($data['status'], $validStatuses)) {
            throw new Exception('Invalid status value');
        }
        
        $sql = "UPDATE orders SET status = ? WHERE order_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data['status'], $data['order_id']]);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Order status updated successfully'
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}
?>
