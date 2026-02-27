<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    /** GET /api/admin/orders?status=...&user_id=... */
    public function index(Request $request)
    {
        $status = $request->query('status', 'all');
        $userId = $request->query('user_id');

        $query = DB::table('orders');
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        if ($userId) {
            $query->where('user_id', (int)$userId);
        }

        $orders = $query->orderByDesc('created_at')->get()->map(function ($o) {
            $o->items = json_decode($o->items, true);
            return $o;
        });

        return response()->json(['success' => true, 'data' => ['orders' => $orders]]);
    }

    /** PUT /api/admin/orders/{id}/status — Body: { status } */
    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:pending,processing,completed,cancelled',
        ]);

        $updated = DB::table('orders')
            ->where(fn($q) => $q->where('id', $id)->orWhere('order_id', $id))
            ->update(['status' => $request->status, 'updated_at' => now()]);

        if (!$updated) {
            return response()->json(['success' => false, 'message' => 'Order not found.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Order status updated.']);
    }

    /** POST /api/admin/orders/{id}/refund — Body: { status } */
    public function processRefund(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:Approved,Rejected,Refunded',
        ]);

        $updated = DB::table('refunds')
            ->where('order_id', $id)
            ->update(['status' => $request->status, 'updated_at' => now()]);

        if (!$updated) {
            return response()->json(['success' => false, 'message' => 'Refund request not found.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Refund status updated.']);
    }
}
