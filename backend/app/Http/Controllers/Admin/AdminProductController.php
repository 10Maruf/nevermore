<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminProductController extends Controller
{
    /** GET /api/admin/products?category={slug} */
    public function index(Request $request)
    {
        $query = Product::with(['category', 'variants.images', 'variants.inventory']);

        if ($slug = $request->query('category')) {
            $query->whereHas('category', fn($q) => $q->where('slug', $slug));
        }

        $products = $query->orderByDesc('created_at')->get();

        return response()->json(['success' => true, 'data' => ['products' => $products]]);
    }

    /**
     * POST /api/admin/products
     * Body: { name, category_slug, description, base_price, size_fit, care_maintenance,
     *         color, color_code, sizes:[{size,quantity}], images:[{url,is_primary,display_order}] }
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'category_slug' => 'required|string',
            'base_price'    => 'required|numeric|min:0',
        ]);

        $category = Category::where('slug', $request->category_slug)->first();
        if (!$category) {
            return response()->json(['success' => false, 'message' => 'Invalid category slug.'], 400);
        }

        DB::beginTransaction();
        try {
            $product = Product::firstOrCreate(
                ['name' => $request->name, 'category_id' => $category->id],
                [
                    'description'      => $request->input('description', ''),
                    'base_price'       => $request->base_price,
                    'size_fit'         => $request->input('size_fit', ''),
                    'care_maintenance' => $request->input('care_maintenance', ''),
                ]
            );

            $color     = $request->input('color', '');
            $sku       = strtoupper(Str::substr($request->name, 0, 3))
                         . '-' . strtoupper(Str::substr($color ?: 'DEF', 0, 3))
                         . '-' . time();

            $variantId = DB::table('product_variants')->insertGetId([
                'product_id' => $product->id,
                'color'      => $color,
                'color_code' => $request->input('color_code', ''),
                'sku'        => $sku,
            ]);

            foreach ((array)$request->input('sizes', []) as $s) {
                DB::table('product_inventory')->insert([
                    'variant_id' => $variantId,
                    'size'       => $s['size'],
                    'quantity'   => (int)($s['quantity'] ?? 0),
                ]);
            }

            foreach ((array)$request->input('images', []) as $idx => $img) {
                DB::table('product_images')->insert([
                    'variant_id'    => $variantId,
                    'image_url'     => $img['url'],
                    'display_order' => $img['display_order'] ?? $idx,
                    'is_primary'    => !empty($img['is_primary']) ? 1 : 0,
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Product created.',
            'data'    => ['product_id' => $product->id, 'variant_id' => $variantId],
        ], 201);
    }

    /** PUT /api/admin/products/{id} */
    public function update(Request $request, int $id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $fillable = $request->only(['name', 'description', 'base_price', 'size_fit', 'care_maintenance']);

        if ($request->filled('category_slug')) {
            $cat = Category::where('slug', $request->category_slug)->first();
            if (!$cat) {
                return response()->json(['success' => false, 'message' => 'Invalid category.'], 400);
            }
            $fillable['category_id'] = $cat->id;
        }

        $product->fill($fillable)->save();

        return response()->json(['success' => true, 'message' => 'Product updated.', 'data' => ['product' => $product]]);
    }

    /** DELETE /api/admin/products/{id} */
    public function destroy(int $id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $product->delete();

        return response()->json(['success' => true, 'message' => 'Product deleted.']);
    }

    /** POST /api/admin/products/upload-image (multipart: image) */
    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|file|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $file = $request->file('image');
        $dir  = public_path('uploads/products');
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = time() . '_' . Str::random(8) . '.' . $file->getClientOriginalExtension();
        $file->move($dir, $filename);

        return response()->json([
            'success' => true,
            'data'    => ['url' => url('uploads/products/' . $filename)],
        ]);
    }
}
