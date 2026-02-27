<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Body: { email, password }
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if (empty($user->email_verified_at)) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email before logging in.',
            ], 403);
        }

        // Revoke old tokens (single session per user)
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data'    => [
                'user'  => $user->load('profile'),
                'token' => $token,
            ],
        ]);
    }

    /**
     * POST /api/auth/register
     * Body: { email, username, password }
     */
    public function register(Request $request)
    {
        $request->validate([
            'email'    => 'required|email|max:255',
            'username' => 'required|string|min:3|max:50',
            'password' => 'required|string|min:8',
        ]);

        if (!preg_match('/[A-Z]/', $request->password)) {
            return response()->json(['success' => false, 'message' => 'Password must contain at least one uppercase letter.'], 422);
        }
        if (!preg_match('/[0-9]/', $request->password)) {
            return response()->json(['success' => false, 'message' => 'Password must contain at least one number.'], 422);
        }

        $existing = User::where('email', $request->email)->first();

        if ($existing) {
            if (!empty($existing->email_verified_at)) {
                return response()->json(['success' => false, 'message' => 'Email already registered. Please login.'], 400);
            }

            // Resend verification to unverified account
            $token   = bin2hex(random_bytes(32));
            $expires = now()->addHours(24);
            $existing->update([
                'email_verification_token'      => $token,
                'email_verification_expires_at' => $expires,
            ]);
            $this->sendVerificationEmail($existing->email, $existing->username ?? $request->username, $token);

            return response()->json([
                'success' => true,
                'message' => 'Account already exists. We sent you a new verification email.',
                'data'    => ['verification_sent' => true],
            ]);
        }

        if (User::where('username', $request->username)->exists()) {
            return response()->json(['success' => false, 'message' => 'Username already taken.'], 400);
        }

        $verificationToken = bin2hex(random_bytes(32));

        $user = User::create([
            'email'                         => $request->email,
            'username'                      => $request->username,
            'password'                      => Hash::make($request->password),
            'role'                          => 'customer',
            'auth_provider'                 => 'local',
            'email_verification_token'      => $verificationToken,
            'email_verification_expires_at' => now()->addHours(24),
        ]);

        $sent = $this->sendVerificationEmail($user->email, $user->username, $verificationToken);

        if (!$sent) {
            $user->delete();
            return response()->json(['success' => false, 'message' => 'Could not send verification email. Please try again later.'], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Please check your email and verify your account.',
            'data'    => [
                'user_id'           => $user->id,
                'email'             => $user->email,
                'username'          => $user->username,
                'verification_sent' => true,
            ],
        ], 201);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    // ----------------------------------------------------------------

    public static function sendVerificationEmail(string $email, string $username, string $token): bool
    {
        try {
            $verifyUrl = url('/api/auth/verify-email') . '?token=' . urlencode($token)
                . '&return_to=' . urlencode(env('FRONTEND_URL', 'http://localhost:5173'));

            Mail::send([], [], function ($message) use ($email, $username, $verifyUrl) {
                $message->to($email)
                    ->subject('Verify your email - Nevermore')
                    ->html(
                        '<p>Hi ' . htmlspecialchars($username) . ',</p>'
                        . '<p>Thanks for signing up! Please verify your email:</p>'
                        . '<p><a href="' . htmlspecialchars($verifyUrl) . '">Verify Email</a></p>'
                        . '<p>This link expires in 24 hours.</p>'
                    );
            });
            return true;
        } catch (\Throwable $e) {
            Log::error('Verification email failed: ' . $e->getMessage());
            return false;
        }
    }
}
