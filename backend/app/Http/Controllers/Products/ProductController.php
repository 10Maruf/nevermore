<?php

namespace App\Http\Controllers\Products;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductPopularityDaily;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    private function variantAvailable(int $variantId): int
    {
        return (int) DB::table('product_inventory')
            ->where('variant_id', $variantId)
            ->sum(DB::raw('quantity - reserved_quantity'));
    }
    /**
     * GET /api/products?category={slug}
     * List products, optionally filtered by category slug.
     */
    public function index(Request $request)
    {
        $categorySlug = $request->query('category');

        $query = Product::with(['category'])
            ->select('products.*');

        if ($categorySlug) {
            $query->whereHas('category', fn($q) => $q->where('slug', $categorySlug));
        }

        $products = $query->orderByDesc('created_at')->get();

        // Attach primary image + stock info per variant
        $products->each(function ($product) {
            $product->variants_summary = $product->variants()
                ->get()
                ->map(function ($variant) {
                    $primaryImage = $variant->images()
                        ->orderByDesc('is_primary')
                        ->orderBy('display_order')
                        ->first();

                    $available = $this->variantAvailable($variant->id);

                    return [
                        'variant_id' => $variant->id,
                        'color'      => $variant->color,
                        'color_code' => $variant->color_code,
                        'image'      => $primaryImage?->image_url,
                        'in_stock'   => $available > 0,
                    ];
                });
        });

        return response()->json([
            'success' => true,
            'data'    => ['products' => $products],
        ]);
    }

    /**
     * GET /api/products/{id}
     * Single product with full variants, inventory, and images.
     */
    public function show(int $id)
    {
        $product = Product::with('category')->find($id);

        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $variants = $product->variants()->get()->map(function ($variant) {
            $inventory = $variant->inventory()->get()->map(fn($inv) => [
                'size'      => $inv->size,
                'quantity'  => $inv->quantity,
                'available' => $inv->available,
                'in_stock'  => $inv->in_stock,
            ]);

            $images = $variant->images()->get()->map(fn($img) => [
                'url'       => $img->image_url,
                'order'     => $img->display_order,
                'is_primary'=> $img->is_primary,
            ]);

            return [
                'variant_id' => $variant->id,
                'color'      => $variant->color,
                'color_code' => $variant->color_code,
                'sku'        => $variant->sku,
                'inventory'  => $inventory,
                'images'     => $images,
            ];
        });

        $product->setRelation('variants', $variants);

        return response()->json([
            'success' => true,
            'data'    => ['product' => $product],
        ]);
    }

    /**
     * GET /api/products/{id}/variations
     */
    public function variations(int $id)
    {
        $product = Product::find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $variants = $product->variants()->with(['images', 'inventory'])->get();

        return response()->json(['success' => true, 'data' => ['variants' => $variants]]);
    }

    /**
     * GET /api/products/search?q={term}&limit=50&offset=0
     */
    public function search(Request $request)
    {
        $q      = trim($request->query('q', ''));
        $limit  = min((int)$request->query('limit', 50), 100);
        $offset = max((int)$request->query('offset', 0), 0);

        if (strlen($q) < 2) {
            return response()->json(['success' => false, 'message' => 'Search query must be at least 2 characters.'], 400);
        }

        $term = '%' . $q . '%';

        $products = Product::with('category')
            ->where(fn($wq) => $wq->where('name', 'like', $term)->orWhere('description', 'like', $term))
            ->orderByRaw('CASE WHEN name LIKE ? THEN 1 ELSE 2 END', [$term])
            ->orderBy('name')
            ->limit($limit)
            ->offset($offset)
            ->get()
            ->map(function ($product) {
                $primaryImage = optional($product->variants()->first())
                    ?->images()
                    ->orderByDesc('is_primary')
                    ->orderBy('display_order')
                    ->first();

                return [
                    'id'            => $product->id,
                    'name'          => $product->name,
                    'description'   => $product->description,
                    'base_price'    => $product->base_price,
                    'category_slug' => $product->category?->slug,
                    'category_name' => $product->category?->name,
                    'image'         => $primaryImage?->image_url,
                ];
            });

        return response()->json(['success' => true, 'data' => ['products' => $products, 'query' => $q]]);
    }

    /**
     * GET /api/products/popular?limit=12&days=30
     */
    public function popular(Request $request)
    {
        $limit = min((int)$request->query('limit', 12), 50);
        $days  = min(max((int)$request->query('days', 30), 1), 365);

        $since = now()->subDays($days)->toDateString();

        // Popular product IDs from click data
        $popularIds = DB::table('product_popularity_daily')
            ->select('product_id', DB::raw('SUM(clicks) as total_clicks'))
            ->where('date', '>=', $since)
            ->groupBy('product_id')
            ->orderByDesc('total_clicks')
            ->limit($limit)
            ->pluck('product_id')
            ->toArray();

        if (empty($popularIds)) {
            // Fallback: latest products
            $popularIds = Product::orderByDesc('created_at')
                ->limit($limit)
                ->pluck('id')
                ->toArray();
        }

        $products = Product::with('category')
            ->whereIn('id', $popularIds)
            ->get()
            ->sortBy(fn($p) => array_search($p->id, $popularIds))
            ->values()
            ->map(function ($product) {
                $variants = $product->variants()->get()->map(function ($variant) {
                    $primaryImage = $variant->images()
                        ->orderByDesc('is_primary')
                        ->orderBy('display_order')
                        ->first();

                    $available = $this->variantAvailable($variant->id);

                    return [
                        'variant_id' => $variant->id,
                        'color'      => $variant->color,
                        'color_code' => $variant->color_code,
                        'image'      => $primaryImage?->image_url,
                        'in_stock'   => $available > 0,
                    ];
                });

                return [
                    'id'            => $product->id,
                    'name'          => $product->name,
                    'base_price'    => $product->base_price,
                    'category_slug' => $product->category?->slug,
                    'category_name' => $product->category?->name,
                    'variants'      => $variants,
                ];
            });

        return response()->json(['success' => true, 'data' => ['products' => $products]]);
    }

    /**
     * POST /api/products/{id}/track-click
     */
    public function trackClick(int $id)
    {
        DB::table('product_popularity_daily')
            ->upsert(
                [['product_id' => $id, 'date' => now()->toDateString(), 'clicks' => 1]],
                ['product_id', 'date'],
                ['clicks' => DB::raw('clicks + 1')]
            );

        return response()->json(['success' => true, 'data' => ['product_id' => $id]]);
    }
}
