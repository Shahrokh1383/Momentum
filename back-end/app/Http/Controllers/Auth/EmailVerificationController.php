<?php

namespace App\Http\Controllers\Auth;

use App\Enums\EmailType;
use App\Http\Controllers\Controller;
use App\Models\SentEmailLog;
use App\Models\User;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function verify(Request $request, string $token)
    {
        $log = SentEmailLog::where('token', $token)
            ->where('type', EmailType::EMAIL_VERIFICATION)
            ->first();

        if (!$log) {
            return $this->errorResponse('invalid_token', 'Invalid or expired verification token', 404);
        }

        $user = User::where('email', $log->recipient_email)->first();

        if (!$user) {
            return $this->errorResponse('user_not_found', 'User not found', 404);
        }

        if ($user->hasVerifiedEmail()) {
            $log->delete();
            return $this->successResponse(null, 'Email already verified.');
        }

        $user->markEmailAsVerified();
        $log->delete();

        return $this->successResponse(null, 'Email verified successfully.');
    }

    public function resend(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);
        
        $user = User::where('email', $request->email)->first();

        if ($user->hasVerifiedEmail()) {
            return $this->successResponse(null, 'Email already verified.');
        }

        $token = \Illuminate\Support\Str::random(60);
        SentEmailLog::create([
            'recipient_email' => $user->email,
            'subject' => 'Verify Email Address',
            'body' => "Please verify your email using token: {$token}",
            'token' => $token,
            'type' => EmailType::EMAIL_VERIFICATION,
        ]);

        return $this->successResponse(null, 'Verification email resent.');
    }

    public function latestToken(Request $request)
    {
        // Validate that the email exists in the users table
        $request->validate(['email' => 'required|email|exists:users,email']);

        // Fetch the latest verification token for this specific user's email
        $log = SentEmailLog::where('recipient_email', $request->email)
            ->where('type', EmailType::EMAIL_VERIFICATION)
            ->latest('created_at')
            ->first();

        if (!$log) {
            return $this->errorResponse('token_not_found', 'No verification token found for this user', 404);
        }

        return $this->successResponse(['token' => $log->token], 'Latest token retrieved.');
    }
}