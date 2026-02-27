<?php
require_once '../../config/config.php';
require_once '../../utils/response.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Return predefined categories matching frontend pages
    $categories = [
        ['id' => 'men-tees', 'name' => "Men's Tees", 'slug' => 'men-tees', 'page' => '/men/tees', 'parent' => 'Men'],
        ['id' => 'men-hoodies', 'name' => "Men's Hoodies", 'slug' => 'men-hoodies', 'page' => '/men/hoodies', 'parent' => 'Men'],
        ['id' => 'men-sweatshirts', 'name' => "Men's Sweatshirts", 'slug' => 'men-sweatshirts', 'page' => '/men/sweatshirts', 'parent' => 'Men'],
        ['id' => 'men-tanktops', 'name' => "Men's Tank Tops", 'slug' => 'men-tanktops', 'page' => '/men/tanktops', 'parent' => 'Men'],
        ['id' => 'men-shorts', 'name' => "Men's Shorts", 'slug' => 'men-shorts', 'page' => '/men/shorts', 'parent' => 'Men'],
        ['id' => 'women-tees', 'name' => "Women's Tees", 'slug' => 'women-tees', 'page' => '/women/tees', 'parent' => 'Women'],
        ['id' => 'women-hoodies', 'name' => "Women's Hoodies", 'slug' => 'women-hoodies', 'page' => '/women/hoodies', 'parent' => 'Women'],
        ['id' => 'women-sweatshirts', 'name' => "Women's Sweatshirts", 'slug' => 'women-sweatshirts', 'page' => '/women/sweatshirts', 'parent' => 'Women'],
        ['id' => 'women-tanktops', 'name' => "Women's Tank Tops", 'slug' => 'women-tanktops', 'page' => '/women/tanktops', 'parent' => 'Women'],
        ['id' => 'women-shorts', 'name' => "Women's Shorts", 'slug' => 'women-shorts', 'page' => '/women/shorts', 'parent' => 'Women'],
        ['id' => 'caps', 'name' => 'Caps', 'slug' => 'caps', 'page' => '/accessories/cap', 'parent' => 'Accessories'],
        ['id' => 'tote-bags', 'name' => 'Tote Bags', 'slug' => 'tote-bags', 'page' => '/accessories/tote', 'parent' => 'Accessories'],
        ['id' => 'wallets', 'name' => 'Wallets', 'slug' => 'wallets', 'page' => '/accessories/wallet', 'parent' => 'Accessories']
    ];
    
    send_success('Categories retrieved successfully', ['categories' => $categories]);
} else {
    send_error('Method not allowed', 405);
}
