<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /** GET /api/orders?status=... */
    public function myOrders(Request $request)
    {
        $user   = $request->user();
        $status = $request->query('status', 'all');

        $allowed = ['all', 'pending', 'processing', 'completed', 'cancelled'];
        if (!in_array($status, $allowed)) {
            return response()->json(['success' => false, 'message' => 'Invalid status filter.'], 400);
        }

        $query = DB::table('orders')->where('user_id', $user->id);
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $orders = $query->orderByDesc('created_at')->get()->map(function ($order) {
            $order->items = json_decode($order->items, true);
            return $order;
        });

        return response()->json(['success' => true, 'data' => ['orders' => $orders]]);
    }

    /** GET /api/orders/{id} */
    public function show(Request $request, string $id)
    {
        $user  = $request->user();
        $order = DB::table('orders')
            ->where('user_id', $user->id)
            ->where(fn($q) => $q->where('id', $id)->orWhere('order_id', $id))
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found.'], 404);
        }

        $order->items = json_decode($order->items, true);

        return response()->json(['success' => true, 'data' => ['order' => $order]]);
    }

    /** POST /api/orders/place */
    public function place(Request $request)
    {
        $request->validate([
            'first_name'    => 'required|string|max:100',
            'last_name'     => 'required|string|max:100',
            'phone'         => 'required|string|max:50',
            'address'       => 'required|string',
            'city'          => 'required|string|max:100',
            'country'       => 'required|string|max:100',
            'items'         => 'required|array|min:1',
            'subtotal'      => 'required|numeric|min:0',
            'shipping_cost' => 'required|numeric|min:0',
            'total_amount'  => 'required|numeric|min:0',
        ]);

        $user  = $request->user();
        $items = $request->items;

        $validItems = array_filter($items, fn($it) => (int)($it['qty'] ?? 0) > 0);
        if (empty($validItems)) {
            return response()->json(['success' => false, 'message' => 'Order must have at least one item.'], 400);
        }

        $hasCustom = collect($items)->contains(fn($i) => !empty($i['isCustom']));
        $hasNormal = collect($items)->contains(fn($i) => empty($i['isCustom']));
        $prefix    = ($hasCustom && $hasNormal) ? 'MD' : ($hasCustom ? 'CD' : 'ORD');
        $orderId   = $prefix . '-' . strtoupper(uniqid());

        DB::beginTransaction();
        try {
            DB::table('orders')->insert([
                'order_id'        => $orderId,
                'user_id'         => $user->id,
                'user_email'      => $user->email,
                'first_name'      => $request->first_name,
                'last_name'       => $request->last_name,
                'company'         => $request->input('company'),
                'phone'           => $request->phone,
                'address'         => $request->address,
                'apartment'       => $request->input('apartment'),
                'city'            => $request->city,
                'postal_code'     => $request->input('postal_code'),
                'country'         => $request->country,
                'items'           => json_encode($items),
                'subtotal'        => $request->subtotal,
                'discount_code'   => $request->input('discount_code'),
                'discount_amount' => $request->input('discount_amount', 0),
                'shipping_cost'   => $request->shipping_cost,
                'total_amount'    => $request->total_amount,
                'payment_method'  => $request->input('payment_method', 'cod'),
                'shipping_method' => $request->input('shipping_method', 'standard'),
                'status'          => 'pending',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            if ($request->filled('discount_code')) {
                DB::table('discount_codes')
                    ->where('code', $request->discount_code)
                    ->increment('current_uses');
            }

            // Decrease inventory for normal product items
            $sizeMap = [
                'X-SMALL' => 'XS', 'SMALL' => 'S', 'MEDIUM' => 'M',
                'LARGE'   => 'L',  'X-LARGE' => 'XL',
                'XXL'     => 'XXL', 'XXXL' => 'XXXL',
            ];

            foreach ($items as $item) {
                if (!empty($item['isCustom'])) continue;
                $productId = $item['productId'] ?? null;
                $size      = $item['size'] ?? null;
                $color     = $item['color'] ?? null;
                $qty       = (int)($item['qty'] ?? 0);
                if (!$productId || !$size || $qty <= 0) continue;

                $dbSize       = $sizeMap[$size] ?? $size;
                $variantQuery = DB::table('product_variants')->where('product_id', $productId);
                if ($color) $variantQuery->where('color', $color);

                foreach ($variantQuery->get() as $variant) {
                    $inv = DB::table('product_inventory')
                        ->where('variant_id', $variant->id)
                        ->where('size', $dbSize)
                        ->first();

                    if ($inv && $inv->quantity >= $qty) {
                        DB::table('product_inventory')
                            ->where('id', $inv->id)
                            ->decrement('quantity', $qty);
                        break;
                    }
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to place order: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order placed successfully.',
            'data'    => ['order_id' => $orderId],
        ], 201);
    }

    /** POST /api/orders/{id}/refund — Body: { requested_items, refund_amount } */
    public function refund(Request $request, string $id)
    {
        $request->validate([
            'requested_items' => 'required|string',
            'refund_amount'   => 'required|numeric|min:0',
        ]);

        $user  = $request->user();
        $order = DB::table('orders')
            ->where('user_id', $user->id)
            ->where(fn($q) => $q->where('id', $id)->orWhere('order_id', $id))
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found.'], 404);
        }

        if (DB::table('refunds')->where('order_id', $order->order_id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Refund already requested for this order.'], 400);
        }

        DB::table('refunds')->insert([
            'order_id'        => $order->order_id,
            'customer_email'  => $user->email,
            'requested_items' => $request->requested_items,
            'refund_amount'   => $request->refund_amount,
            'status'          => 'Pending',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Refund request submitted.'], 201);
    }
}
