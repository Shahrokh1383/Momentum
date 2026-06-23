<?php

namespace App\Services\User\Identity\Profile;

use App\Models\Identity\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class AvatarService
{
    public function getAvatarData(User $user): array
    {
        $disk = Storage::disk('public');

        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $absolutePath = $disk->path($user->avatar_path);
            
            return [
                'type' => 'local',
                'path' => $absolutePath,
                'mime' => File::mimeType($absolutePath),
            ];
        }

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
                return [
                    'type' => 'remote',
                    'body' => base64_decode($imageContent['body']),
                    'mime' => $imageContent['content_type'],
                ];
            }
        }

        return ['type' => 'default'];
    }

    public function uploadAvatar(User $user, UploadedFile $file): string
    {
        $disk = Storage::disk('public');

        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $disk->delete($user->avatar_path);
        }

        $path = $file->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        return $path;
    }

    public function deleteAvatar(User $user): void
    {
        $disk = Storage::disk('public');
        
        if ($user->avatar_path && $disk->exists($user->avatar_path)) {
            $disk->delete($user->avatar_path);
        }
        
        $user->update(['avatar_path' => null]);
    }
}