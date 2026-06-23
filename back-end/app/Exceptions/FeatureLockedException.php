<?php

namespace App\Exceptions;

use App\Enums\Billing\PlanSlug;
use RuntimeException;

class FeatureLockedException extends RuntimeException
{
    public function __construct(
        public string $feature,
        public PlanSlug $requiredPlan
    ) {
        parent::__construct("Feature {$feature} is locked.");
    }

    public function render()
    {
        return response()->json([
            'success' => false,
            'error' => 'feature_locked',
            'message' => 'This feature is not available in your current plan.',
            'feature' => $this->feature,
            'required_plan' => $this->requiredPlan->value,
        ], 422);
    }
}