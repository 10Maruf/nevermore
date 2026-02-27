<?php
/**
 * Evermore Backend API Entry Point
 * Purpose: Verify the API is running
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'status' => 'success',
    'message' => 'Evermore PHP API is running',
    'version' => '1.0.0',
    'endpoints' => [
        'auth' => [
            'register' => '/api/auth/register.php',
            'login' => '/api/auth/login.php'
        ],
        // New products system (recommended)
        'products' => [
            'list' => '/api/products/products.php',
            'search' => '/api/products/search.php',
            'categories' => '/api/products/categories.php'
        ],
        // Legacy products system (older schema)
        'legacy_products' => '/api/product/get_products.php',
        'cart' => '/api/cart/',
        'orders' => '/api/order/',
        'wishlist' => '/api/wishlist/'
    ]
]);
?>
