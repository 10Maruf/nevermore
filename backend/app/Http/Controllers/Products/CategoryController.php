<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryImage;
use Illuminate\Http\Request;

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

        return response()->json(['success' => true, 'data' => $categories]);
    }

    /**
     * GET /api/products/categories/images
     * Returns flat array: [{ category_slug, image_url }, ...]
     */
    public function images()
    {
        $images = CategoryImage::all()->map(fn($ci) => [
            'category_slug' => $ci->category_slug,
            'image_url'     => $ci->image_url,
        ])->values();

        return response()->json(['success' => true, 'data' => $images]);
    }

    /**
     * POST /api/admin/categories/images
     * Body: { category_slug, image_url }
     */
    public function storeImage(Request $request)
    {
        $request->validate([
            'category_slug' => 'required|string|max:100',
            'image_url'     => 'required|string',
        ]);

        $image = CategoryImage::updateOrCreate(
            ['category_slug' => $request->category_slug],
            ['image_url'     => $request->image_url]
        );

        return response()->json(['success' => true, 'message' => 'Category image saved.', 'data' => $image]);
    }

    /**
     * DELETE /api/admin/categories/images/{slug}
     */
    public function deleteImage(string $slug)
    {
        $deleted = CategoryImage::where('category_slug', $slug)->delete();

        if (!$deleted) {
            return response()->json(['success' => false, 'message' => 'Category image not found.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Category image deleted.']);
    }
}
