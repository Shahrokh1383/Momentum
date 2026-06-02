<?php

namespace App\Traits;

trait HasApiResponse
{
    protected function successResponse(mixed $data = null, string $message = 'Success', int $status = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function errorResponse(string $error, string $message = 'Error', int $status = 400, mixed $details = null): \Illuminate\Http\JsonResponse
    {
        $response = [
            'success' => false,
            'error' => $error,
            'message' => $message,
        ];

        if ($details !== null) {
            $response['details'] = $details;
        }

        return response()->json($response, $status);
    }
}