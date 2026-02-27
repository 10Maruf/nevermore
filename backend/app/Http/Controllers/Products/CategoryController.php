<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryImage;

class CategoryController extends Controller
{
    /**
     * GET /api/products/categories
     */
    public function index()
    {
        $categories = Category::with('image')
            ->orderBy('parent_category')
            ->orderBy('name')
            ->get()
            ->map(fn($cat) => [
                'id'              => $cat->id,
                'name'            => $cat->name,
                'slug'            => $cat->slug,
                'parent_category' => $cat->parent_category,
                'image_url'       => $cat->image?->image_url,
            ]);

        return response()->json(['success' => true, 'data' => ['categories' => $categories]]);
    }

    /**
     * GET /api/products/categories/images
     */
    public function images()
    {
        $images = CategoryImage::all()->keyBy('category_slug');

        return response()->json(['success' => true, 'data' => ['images' => $images]]);
    }
}
