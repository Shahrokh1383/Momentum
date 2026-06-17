<?php

namespace App\Http\Controllers\User\Profile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AvatarController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $avatarUrl = $user->avatar;

        if (!$avatarUrl || !filter_var($avatarUrl, FILTER_VALIDATE_URL)) {
            return $this->defaultAvatar();
        }

        $cacheKey = 'avatar_' . md5($avatarUrl);
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

        if (!$imageContent) {
            return $this->defaultAvatar();
        }

        return response(base64_decode($imageContent['body']), 200)
            ->header('Content-Type', $imageContent['content_type'])
            ->header('Cache-Control', 'public, max-age=21600');
    }

    private function defaultAvatar(): Response
    {
        $path = public_path('assets/default-avatar.png');
        if (file_exists($path)) {
            return response(file_get_contents($path), 200)
                ->header('Content-Type', 'image/png')
                ->header('Cache-Control', 'public, max-age=86400');
        }
        $pixel = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/9i4f8cAAAAASUVORK5CYII=');
        return response($pixel, 200)->header('Content-Type', 'image/png');
    }
}