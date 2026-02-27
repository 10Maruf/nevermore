<?php

namespace App\Http\Controllers\Discounts;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DiscountController extends Controller
{
    /**
     * GET /api/discounts?code=...  — validate a code (public)
     * GET /api/discounts           — list all (admin, requires auth token)
     */
    public function index(Request $request)
    {
        $code = $request->query('code');
        if ($code) {
            return $this->validateCode((string)$code, (float)$request->query('subtotal', 0));
        }

        // Admin-only list
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        if (!$user->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Admin access required.'], 403);
        }

        $discounts = DB::table('discount_codes')->orderByDesc('created_at')->get();

        return response()->json(['success' => true, 'data' => ['discounts' => $discounts]]);
    }

    /** POST /api/discounts/validate — Body: { code, subtotal? } */
    public function validate(Request $request)
    {
        $request->validate([
            'code'     => 'required|string|max:50',
            'subtotal' => 'sometimes|numeric|min:0',
        ]);

        return $this->validateCode($request->code, (float)$request->input('subtotal', 0));
    }

    private function validateCode(string $code, float $subtotal = 0)
    {
        $discount = DB::table('discount_codes')
            ->where('code', strtoupper(trim($code)))
            ->where('status', 'active')
            ->first();

        if (!$discount) {
            return response()->json(['success' => false, 'message' => 'Invalid discount code.'], 404);
        }

        if ($discount->expiry_date && now()->toDateString() > $discount->expiry_date) {
            return response()->json(['success' => false, 'message' => 'Discount code has expired.'], 400);
        }

        if ($discount->max_uses && $discount->current_uses >= $discount->max_uses) {
            return response()->json(['success' => false, 'message' => 'Discount code has reached maximum uses.'], 400);
        }

        if ($subtotal > 0 && $discount->min_purchase && $subtotal < (float)$discount->min_purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Minimum purchase of ' . $discount->min_purchase . ' required.',
            ], 400);
        }

        $discountAmount = 0;
        if ($subtotal > 0) {
            $discountAmount = $discount->type === 'percentage'
                ? round($subtotal * (float)$discount->value / 100, 2)
                : min((float)$discount->value, $subtotal);
        }

        return response()->json([
            'success' => true,
            'message' => 'Discount code is valid.',
            'data'    => [
                'code'            => $discount->code,
                'type'            => $discount->type,
                'value'           => $discount->value,
                'discount_amount' => $discountAmount,
                'min_purchase'    => $discount->min_purchase,
            ],
        ]);
    }

    /** POST /api/admin/discounts — Create a discount code (admin) */
    public function store(Request $request)
    {
        $request->validate([
            'code'         => 'required|string|max:50',
            'type'         => 'required|in:percentage,fixed',
            'value'        => 'required|numeric|min:0',
            'min_purchase' => 'sometimes|numeric|min:0',
            'expiry_date'  => 'nullable|date',
            'max_uses'     => 'nullable|integer|min:1',
        ]);

        $exists = DB::table('discount_codes')->where('code', strtoupper(trim($request->code)))->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Discount code already exists.'], 409);
        }

        $id = DB::table('discount_codes')->insertGetId([
            'code'         => strtoupper(trim($request->code)),
            'type'         => $request->type,
            'value'        => $request->value,
            'min_purchase' => $request->input('min_purchase', 0),
            'expiry_date'  => $request->input('expiry_date'),
            'max_uses'     => $request->input('max_uses'),
            'current_uses' => 0,
            'status'       => 'active',
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $discount = DB::table('discount_codes')->find($id);

        return response()->json(['success' => true, 'message' => 'Discount code created.', 'data' => $discount], 201);
    }

    /** DELETE /api/admin/discounts/{id} — Delete a discount code (admin) */
    public function destroy(int $id)
    {
        $deleted = DB::table('discount_codes')->where('id', $id)->delete();

        if (!$deleted) {
            return response()->json(['success' => false, 'message' => 'Discount code not found.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Discount code deleted.']);
    }
}
