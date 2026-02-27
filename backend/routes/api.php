<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\User\ProfileController;
use App\Http\Controllers\Products\ProductController;
use App\Http\Controllers\Products\CategoryController;
use App\Http\Controllers\Cart\CartController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\Discounts\DiscountController;
use App\Http\Controllers\Designs\DesignController;
use App\Http\Controllers\Admin\AdminProductController;
use App\Http\Controllers\Admin\AdminOrderController;

/*
|--------------------------------------------------------------------------
| Auth Routes (Public)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

    // Email verification
    Route::post('/verify-email', [EmailVerificationController::class, 'verify']);
    Route::get('/verify-email', [EmailVerificationController::class, 'verify']); // link click from email
    Route::post('/resend-verification', [EmailVerificationController::class, 'resend']);

    // Password reset
    Route::post('/forgot-password', [PasswordResetController::class, 'request']);
    Route::post('/verify-reset-token', [PasswordResetController::class, 'verifyToken']);
    Route::post('/reset-password', [PasswordResetController::class, 'reset']);
});

/*
|--------------------------------------------------------------------------
| Public Product Routes
|--------------------------------------------------------------------------
*/
Route::prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']);
    Route::get('/search', [ProductController::class, 'search']);
    Route::get('/popular', [ProductController::class, 'popular']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/images', [CategoryController::class, 'images']);
    Route::get('/{id}', [ProductController::class, 'show']);
    Route::get('/{id}/variations', [ProductController::class, 'variations']);
    Route::post('/{id}/track-click', [ProductController::class, 'trackClick']);
});

/*
|--------------------------------------------------------------------------
| Discount Routes (Public)
|--------------------------------------------------------------------------
*/
Route::get('/discounts', [DiscountController::class, 'index']);
Route::post('/discounts/validate', [DiscountController::class, 'validate']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Require Auth)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Current authenticated user
    Route::get('/user', function (Request $request) {
        return $request->user()->load('profile');
    });

    // User profile
    Route::prefix('user')->group(function () {
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/change-password', [ProfileController::class, 'changePassword']);
        Route::post('/request-email-change', [ProfileController::class, 'requestEmailChange']);
    });

    // email-change verify is public (clicked from email link)
    Route::get('/user/verify-email-change', [ProfileController::class, 'verifyEmailChange']);

    // Cart
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/add', [CartController::class, 'add']);
        Route::delete('/remove', [CartController::class, 'remove']);
    });

    // Orders
    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'myOrders']);
        Route::post('/place', [OrderController::class, 'place']);
        Route::get('/{id}', [OrderController::class, 'show']);
        Route::post('/{id}/refund', [OrderController::class, 'refund']);
    });

    // Custom Designs
    Route::prefix('designs')->group(function () {
        Route::get('/', [DesignController::class, 'index']);
        Route::get('/{id}', [DesignController::class, 'show']);
        Route::post('/', [DesignController::class, 'save']);
        Route::post('/upload-asset', [DesignController::class, 'uploadAsset']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->middleware('admin')->group(function () {

        // Products
        Route::prefix('products')->group(function () {
            Route::get('/', [AdminProductController::class, 'index']);
            Route::post('/', [AdminProductController::class, 'store']);
            Route::put('/{id}', [AdminProductController::class, 'update']);
            Route::delete('/{id}', [AdminProductController::class, 'destroy']);
            Route::post('/upload-image', [AdminProductController::class, 'uploadImage']);
        });

        // Orders
        Route::prefix('orders')->group(function () {
            Route::get('/', [AdminOrderController::class, 'index']);
            Route::put('/{id}/status', [AdminOrderController::class, 'updateStatus']);
            Route::post('/{id}/refund', [AdminOrderController::class, 'processRefund']);
        });
    });
});
