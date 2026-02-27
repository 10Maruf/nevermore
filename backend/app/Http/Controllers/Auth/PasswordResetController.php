<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PasswordResetController extends Controller
{
    /**
     * POST /api/auth/forgot-password
     * Body: { email }
     * Sends a reset link - always returns success to prevent email enumeration.
     */
    public function request(Request $req)
    {
        $req->validate(['email' => 'required|email']);

        $user = User::where('email', $req->email)->first();

        if ($user) {
            // Rate limit: max 3 requests per minute
            $recentCount = DB::table('password_resets')
                ->where('email', $req->email)
                ->where('created_at', '>', now()->subMinute())
                ->count();

            if ($recentCount < 3) {
                // Invalidate old tokens
                DB::table('password_resets')
                    ->where('user_id', $user->id)
                    ->whereNull('used_at')
                    ->update(['used_at' => now()]);

                $token     = bin2hex(random_bytes(32));
                $tokenHash = hash('sha256', $token);
                $expiresAt = now()->addMinutes(30);

                DB::table('password_resets')->insert([
                    'user_id'    => $user->id,
                    'email'      => $user->email,
                    'token_hash' => $tokenHash,
                    'expires_at' => $expiresAt,
                    'created_at' => now(),
                    'request_ip' => $req->ip(),
                    'user_agent' => substr((string)$req->userAgent(), 0, 255),
                ]);

                $resetUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/') . '/reset-password?token=' . urlencode($token);

                try {
                    Mail::send([], [], function ($message) use ($user, $resetUrl) {
                        $message->to($user->email)
                            ->subject('Reset your Nevermore password')
                            ->html(
                                '<p>We received a request to reset your password.</p>'
                                . '<p><a href="' . htmlspecialchars($resetUrl) . '">Reset Password</a></p>'
                                . '<p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>'
                            );
                    });
                } catch (\Throwable $e) {
                    Log::error('Password reset email failed: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'A password reset link has been sent to your email address.',
        ]);
    }

    /**
     * POST /api/auth/verify-reset-token
     * Body: { token }
     */
    public function verifyToken(Request $req)
    {
        $req->validate(['token' => 'required|string']);

        $tokenHash = hash('sha256', $req->token);

        $exists = DB::table('password_resets')
            ->where('token_hash', $tokenHash)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->exists();

        if (!$exists) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired token.'], 400);
        }

        return response()->json(['success' => true, 'message' => 'Token is valid.']);
    }

    /**
     * POST /api/auth/reset-password
     * Body: { token, password }
     */
    public function reset(Request $req)
    {
        $req->validate([
            'token'    => 'required|string|min:20',
            'password' => 'required|string|min:8',
        ]);

        if (!preg_match('/[A-Z]/', $req->password)) {
            return response()->json(['success' => false, 'message' => 'Password must contain at least one uppercase letter.'], 422);
        }
        if (!preg_match('/[0-9]/', $req->password)) {
            return response()->json(['success' => false, 'message' => 'Password must contain at least one number.'], 422);
        }

        $tokenHash = hash('sha256', $req->token);

        $resetRow = DB::table('password_resets')
            ->where('token_hash', $tokenHash)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$resetRow) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired token.'], 400);
        }

        DB::transaction(function () use ($resetRow, $req) {
            // Update password
            User::where('id', $resetRow->user_id)
                ->update(['password' => Hash::make($req->password)]);

            // Mark token used
            DB::table('password_resets')
                ->where('id', $resetRow->id)
                ->update(['used_at' => now()]);

            // Revoke all Sanctum tokens (force logout)
            DB::table('personal_access_tokens')
                ->where('tokenable_id', $resetRow->user_id)
                ->where('tokenable_type', User::class)
                ->delete();
        });

        return response()->json(['success' => true, 'message' => 'Password updated successfully.']);
    }
}
