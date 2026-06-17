<?php

namespace App\Http\Controllers\User\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Profile\UpdateAvatarRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AvatarController extends Controller
{
    /**
     * Display the user's avatar with a strict fallback chain.
     */
    public function show(Request $request): Response|BinaryFileResponse
    {
        $user = $request->user();
        
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        // 1. Priority: Custom Local Avatar
        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $filePath = $disk->path($user->avatar_path);
            $mimeType = $disk->mimeType($user->avatar_path);
            
            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        // 2. Fallback: OAuth Avatar URL
        $avatarUrl = $user->avatar;
        if ($avatarUrl && filter_var($avatarUrl, FILTER_VALIDATE_URL)) {
            $cacheKey = 'avatar_url_' . md5($avatarUrl);
            $imageContent = Cache::remember($cacheKey, now()->addHours(6), function () use ($avatarUrl) {
                $response = Http::timeout(10)->get($avatarUrl);
                if ($response->successful()) {
                    return [
                        'body' => base64_encode($response->body()),
                        'content_type' => $response->header('Content-Type') ?? 'image/jpeg',
                    ];
                }
                return null;
            });

            if ($imageContent) {
                return response(base64_decode($imageContent['body']), 200)
                    ->header('Content-Type', $imageContent['content_type'])
                    ->header('Cache-Control', 'public, max-age=21600');
            }
        }

        // 3. Ultimate Fallback: Default Asset
        return $this->defaultAvatar();
    }

    /**
     * Upload a new custom avatar.
     */
    public function update(UpdateAvatarRequest $request): JsonResponse
    {
        $user = $request->user();
        
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        // Delete old custom avatar from storage to prevent orphan files (DRY & Clean Storage)
        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $disk->delete($user->avatar_path);
        }

        // Store new avatar in 'storage/app/public/avatars'
        $path = $request->file('avatar')->store('avatars', 'public');

        // Update database record
        $user->update(['avatar_path' => $path]);

        return response()->json([
            'message' => 'Avatar updated successfully.',
            'data' => [
                'avatar_path' => $path,
                'url' => $disk->url($path),
            ]
        ], 200);
    }

    /**
     * Delete the custom avatar and trigger the fallback mechanism.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        // Delete physical file
        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $disk->delete($user->avatar_path);
        }

        // Reset database column to trigger fallback logic in show()
        $user->update(['avatar_path' => null]);

        return response()->json([
            'message' => 'Avatar removed successfully. Fallback avatar restored.',
        ], 200);
    }

    /**
     * Return the default system avatar.
     */
    private function defaultAvatar(): Response|BinaryFileResponse
    {
        $path = public_path('assets/default-avatar.png');
        if (file_exists($path)) {
            return response()->file($path, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }
        
        // 1x1 transparent pixel fallback
        $pixel = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/9i4f8cAAAAASUVORK5CYII=');
        return response($pixel, 200)->header('Content-Type', 'image/png');
    }
}