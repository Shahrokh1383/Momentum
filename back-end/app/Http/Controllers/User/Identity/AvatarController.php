<?php

namespace App\Http\Controllers\User\Identity;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Profile\UpdateAvatarRequest;
use App\Services\User\Identity\Profile\AvatarService; 
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AvatarController extends Controller
{
    public function __construct(private AvatarService $avatarService) {}

    public function show(Request $request): Response|BinaryFileResponse
    {
        $data = $this->avatarService->getAvatarData($request->user());

        if ($data['type'] === 'local') {
            return response()->file($data['path'], [
                'Content-Type' => $data['mime'],
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        if ($data['type'] === 'remote') {
            return response($data['body'], 200)
                ->header('Content-Type', $data['mime'])
                ->header('Cache-Control', 'public, max-age=21600');
        }

        return $this->defaultAvatar();
    }

    public function update(UpdateAvatarRequest $request): JsonResponse
    {
        $path = $this->avatarService->uploadAvatar($request->user(), $request->file('avatar'));
        $disk = Storage::disk('public');

        return $this->successResponse([
            'avatar_path' => $path,
            'url' => $disk->url($path),
        ], 'Avatar updated successfully.');
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->avatarService->deleteAvatar($request->user());
        return $this->successResponse(null, 'Avatar removed successfully. Fallback avatar restored.');
    }

    private function defaultAvatar(): Response|BinaryFileResponse
    {
        $path = public_path('assets/default-avatar.png');
        if (file_exists($path)) {
            return response()->file($path, ['Content-Type' => 'image/png', 'Cache-Control' => 'public, max-age=86400']);
        }
        $pixel = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/9i4f8cAAAAASUVORK5CYII=');
        return response($pixel, 200)->header('Content-Type', 'image/png');
    }
}