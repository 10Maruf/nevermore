<?php

namespace App\Http\Controllers\Cart;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CartController — The frontend manages cart state via localStorage.
 * These endpoints act as stock-validation helpers.
 */
class CartController extends Controller
{
    /**
     * GET /api/cart?items=[{variant_id,size,qty}]
     * Returns availability info for each item.
     */
    public function index(Request $request)
    {
        $rawItems = $request->query('items', '[]');
        $items    = is_string($rawItems) ? json_decode($rawItems, true) : [];

        if (!is_array($items) || empty($items)) {
            return response()->json(['success' => true, 'data' => ['items' => [], 'warnings' => []]]);
        }

        $validated = [];
        $warnings  = [];

        foreach ($items as $item) {
            $variantId = (int)($item['variant_id'] ?? 0);
            $size      = (string)($item['size'] ?? '');
            $qty       = (int)($item['qty'] ?? 1);

            if (!$variantId || $size === '') continue;

            $inv = DB::table('product_inventory')
                ->where('variant_id', $variantId)
                ->where('size', $size)
                ->first();

            $available = $inv ? max(0, $inv->quantity - $inv->reserved_quantity) : 0;

            if ($available < $qty) {
                $warnings[] = "Only {$available} left for variant {$variantId} / size {$size}.";
            }

            $validated[] = array_merge($item, ['available' => $available, 'in_stock' => $available > 0]);
        }

        return response()->json(['success' => true, 'data' => ['items' => $validated, 'warnings' => $warnings]]);
    }

    /**
     * POST /api/cart/add
     * Body: { variant_id, size, qty } — validates stock before frontend adds to cart.
     */
    public function add(Request $request)
    {
        $request->validate([
            'variant_id' => 'required|integer',
            'size'       => 'required|string|max:10',
            'qty'        => 'required|integer|min:1',
        ]);

        $inv = DB::table('product_inventory')
            ->where('variant_id', $request->variant_id)
            ->where('size', $request->size)
            ->first();

        if (!$inv) {
            return response()->json(['success' => false, 'message' => 'Item not found.'], 404);
        }

        $available = max(0, $inv->quantity - $inv->reserved_quantity);

        if ($available < $request->qty) {
            return response()->json([
                'success'   => false,
                'message'   => "Only {$available} units available.",
                'available' => $available,
            ], 400);
        }

        return response()->json(['success' => true, 'message' => 'Stock confirmed.', 'available' => $available]);
    }

    /** DELETE /api/cart/remove — cart is on frontend; always succeeds */
    public function remove(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Item removed.']);
    }
}
