<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class ActiveHabitScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     * Automatically filters out archived habits to enforce quota rules.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $builder->whereNull('archived_at');
    }
}