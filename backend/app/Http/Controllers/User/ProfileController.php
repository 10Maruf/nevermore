<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class ProfileController extends Controller
{
    /** GET /api/user/profile */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data'    => [
                'id'            => $user->id,
                'email'         => $user->email,
                'username'      => $user->username,
                'role'          => $user->role,
                'first_name'    => (string)($user->first_name ?? ''),
                'last_name'     => (string)($user->last_name ?? ''),
                'pending_email' => (string)($user->pending_email ?? ''),
                'avatar'        => $user->avatar,
            ],
        ]);
    }

    /** PUT /api/user/profile — Body: { first_name, last_name } */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name'  => 'sometimes|string|max:100',
        ]);

        if (empty($validated)) {
            return response()->json(['success' => false, 'message' => 'Nothing to update.'], 400);
        }

        $user = $request->user();
        $user->fill($validated)->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated.',
            'data'    => ['first_name' => $user->first_name, 'last_name' => $user->last_name],
        ]);
    }

    /** POST /api/user/change-password — Body: { current_password, new_password, new_password_confirmation } */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Current password is incorrect.'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();
        $user->tokens()->delete(); // revoke all tokens

        return response()->json(['success' => true, 'message' => 'Password changed. Please log in again.']);
    }

    /** POST /api/user/request-email-change — Body: { email } */
    public function requestEmailChange(Request $request)
    {
        $request->validate(['email' => 'required|email|max:255']);

        $user     = $request->user();
        $newEmail = strtolower(trim($request->email));

        if ($newEmail === strtolower($user->email)) {
            return response()->json(['success' => true, 'message' => 'Email is unchanged.']);
        }

        if (\App\Models\User::where('email', $newEmail)->where('id', '!=', $user->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'This email is already in use.'], 400);
        }

        $token     = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);

        $user->pending_email           = $newEmail;
        $user->email_change_token_hash = $tokenHash;
        $user->email_change_expires_at = now()->addHours(24);
        $user->save();

        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $verifyUrl   = url('/api/user/verify-email-change')
            . '?token=' . urlencode($token)
            . '&return_to=' . urlencode($frontendUrl . '/profile');

        $name    = $user->username ?: 'there';
        $html    = "<p>Hi $name,</p><p>Confirm changing your email to <strong>$newEmail</strong>:</p>"
                   . "<p><a href=\"$verifyUrl\">Confirm Email Change</a></p>"
                   . "<p>Expires in 24 hours.</p>";
        $text    = "Confirm email change:\n$verifyUrl\n\nExpires in 24 hours.";

        Mail::send([], [], function ($msg) use ($newEmail, $html, $text) {
            $msg->to($newEmail)
                ->subject('Confirm your new email — Nevermore')
                ->setBody($html, 'text/html')
                ->addPart($text, 'text/plain');
        });

        return response()->json(['success' => true, 'message' => 'Confirmation link sent to your new email.']);
    }

    /** GET /api/user/verify-email-change?token=...&return_to=... (public, redirect) */
    public function verifyEmailChange(Request $request)
    {
        $token    = trim($request->query('token', ''));
        $returnTo = $request->query('return_to', '');

        $base       = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $safeReturn = $this->safeRedirectUrl($returnTo, $base);
        $failUrl    = $safeReturn . '/profile?email_changed=0';

        if (strlen($token) < 20) {
            return redirect($failUrl);
        }

        $user = \App\Models\User::where('email_change_token_hash', hash('sha256', $token))
            ->where('email_change_expires_at', '>', now())
            ->first();

        if (!$user || !$user->pending_email) {
            return redirect($failUrl);
        }

        $user->email                   = $user->pending_email;
        $user->pending_email           = null;
        $user->email_change_token_hash = null;
        $user->email_change_expires_at = null;
        $user->email_verified_at       = now();
        $user->save();

        return redirect($safeReturn . '/profile?email_changed=1');
    }

    private function safeRedirectUrl(string $url, string $fallback): string
    {
        if ($url === '') return $fallback;
        $p = parse_url($url);
        $host   = strtolower($p['host'] ?? '');
        $scheme = strtolower($p['scheme'] ?? '');
        $allowed = array_filter(['localhost', '127.0.0.1', parse_url($fallback, PHP_URL_HOST) ?? '']);
        if (!in_array($scheme, ['http', 'https']) || !in_array($host, $allowed)) {
            return $fallback;
        }
        return rtrim($url, '/');
    }
}
