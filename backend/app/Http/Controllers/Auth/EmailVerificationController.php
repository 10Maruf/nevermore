<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * POST /api/auth/verify-email
     * Body: { token }
     *
     * Also handles GET redirect (verify link clicked from email).
     */
    public function verify(Request $request)
    {
        $token      = $request->input('token', $request->query('token', ''));
        $returnTo   = $request->query('return_to', env('FRONTEND_URL', 'http://localhost:5173'));
        $wantJson   = $request->expectsJson() || $request->isMethod('post');

        if (empty($token)) {
            if ($wantJson) {
                return response()->json(['success' => false, 'message' => 'Missing verification token.'], 400);
            }
            return redirect(rtrim($returnTo, '/') . '/login?verified=0');
        }

        $user = User::where('email_verification_token', $token)
            ->where('email_verification_expires_at', '>', now())
            ->first();

        if (!$user) {
            if ($wantJson) {
                return response()->json(['success' => false, 'message' => 'Invalid or expired verification token.'], 400);
            }
            return redirect(rtrim($returnTo, '/') . '/login?verified=0');
        }

        $user->update([
            'email_verified_at'             => now(),
            'email_verification_token'      => null,
            'email_verification_expires_at' => null,
        ]);

        if ($wantJson) {
            return response()->json(['success' => true, 'message' => 'Email verified successfully.']);
        }

        return redirect(rtrim($returnTo, '/') . '/login?verified=1');
    }

    /**
     * POST /api/auth/resend-verification
     * Body: { email }
     */
    public function resend(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Email not found. Please sign up first.'], 404);
        }

        if (!empty($user->email_verified_at)) {
            return response()->json(['success' => true, 'message' => 'Your email is already verified. Please login.']);
        }

        $token = bin2hex(random_bytes(32));
        $user->update([
            'email_verification_token'      => $token,
            'email_verification_expires_at' => now()->addHours(24),
        ]);

        AuthController::sendVerificationEmail($user->email, $user->username ?? '', $token);

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent. Please check your inbox.',
        ]);
    }
}
