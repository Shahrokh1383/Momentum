<?php

namespace App\Http\Controllers\Auth;

use App\Enums\EmailType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\SentEmailLog;
use App\Models\User;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function forgot(ForgotPasswordRequest $request)
    {
        $token = Str::random(60);

        // Generate a production-ready frontend URL with proper query parameters
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');
        $resetUrl = $frontendUrl . '/reset-password?' . http_build_query([
            'token' => $token,
            'email' => $request->email,
        ]);

        SentEmailLog::create([
            'recipient_email' => $request->email,
            'subject' => 'Reset Password Notification',
            'body' => "You are receiving this email because we received a password reset request for your account. Click the link to reset your password: {$resetUrl}",
            'token' => $token,
            'type' => EmailType::PASSWORD_RESET,
        ]);

        return $this->successResponse(null, 'If the email exists, reset instructions have been sent.');
    }

    public function reset(ResetPasswordRequest $request)
    {
        $log = SentEmailLog::where('token', $request->token)
            ->where('type', EmailType::PASSWORD_RESET)
            ->where('recipient_email', $request->email)
            ->first();

        if (!$log) {
            return $this->errorResponse('invalid_token', 'Invalid or expired reset token', 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->update(['password' => $request->password]);
        $log->delete();

        return $this->successResponse(null, 'Password reset successfully.');
    }
}