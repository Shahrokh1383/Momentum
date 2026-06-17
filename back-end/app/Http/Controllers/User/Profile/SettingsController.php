<?php

namespace App\Http\Controllers\User\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Profile\UpdatePreferencesRequest;
use App\Http\Requests\User\Profile\UpdateProfileRequest;
use App\Http\Resources\User\UserResource;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Update core profile information (Name, Bio, Visibility).
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return $this->successResponse(
            new UserResource($user->load('settings')),
            'Profile updated successfully.'
        );
    }

    /**
     * Update user preferences (Timezone, Theme, Language, Date Format).
     */
    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $user = $request->user();
        
        // Update or create the settings record seamlessly
        $user->settings()->updateOrCreate(
            ['user_id' => $user->id],
            $request->validated()
        );

        return $this->successResponse(
            new UserResource($user->load('settings')),
            'Preferences updated successfully.'
        );
    }
}