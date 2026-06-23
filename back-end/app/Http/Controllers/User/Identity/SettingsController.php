<?php

namespace App\Http\Controllers\User\Identity;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Profile\UpdatePreferencesRequest;
use App\Http\Requests\User\Profile\UpdateProfileRequest;
use App\Http\Resources\User\UserResource;
use App\Services\User\Identity\Profile\ProfileService; 
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    public function __construct(private ProfileService $profileService) {}

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->profileService->updateProfile($request->user(), $request->validated());
        return $this->successResponse(new UserResource($user), 'Profile updated successfully.');
    }

    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $user = $this->profileService->updatePreferences($request->user(), $request->validated());
        return $this->successResponse(new UserResource($user), 'Preferences updated successfully.');
    }
}