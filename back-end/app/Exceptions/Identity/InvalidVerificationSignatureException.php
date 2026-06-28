<?php

namespace App\Exceptions\Identity;

use Illuminate\Http\JsonResponse;

class InvalidVerificationSignatureException extends \Exception
{
    public function render($request): JsonResponse
    {
        return response()->json([
            'message' => 'The verification link is invalid or has expired. Please request a new one.',
        ], 422);
    }
}