<?php

namespace App\Services\User\Identity\Profile;

use App\Models\Identity\User;

class ProfileService
{
    public function updateProfile(User $user, array $data): User
    {
        $user->update($data);
        return $user->load('settings');
    }

    public function updatePreferences(User $user, array $data): User
    {
        $user->settings()->updateOrCreate(
            ['user_id' => $user->id],
            $data
        );
        return $user->load('settings');
    }
}