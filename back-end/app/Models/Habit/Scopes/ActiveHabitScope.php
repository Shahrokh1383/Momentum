<?php

namespace App\Models\Habit\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class ActiveHabitScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->whereNull('archived_at');
    }
}