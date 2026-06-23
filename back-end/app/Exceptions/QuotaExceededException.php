<?php

namespace App\Exceptions;

use App\Enums\Billing\PlanSlug;
use RuntimeException;

class QuotaExceededException extends RuntimeException
{
    public function __construct(
        public string $resource,
        public int $limit,
        public int $used,
        public ?PlanSlug $upgradeRequired = null
    ) {
        parent::__construct("Quota exceeded for resource: {$resource}.");
    }

    public function render()
    {
        return response()->json([
            'success' => false,
            'error' => 'quota_exceeded',
            'message' => 'You have reached your plan limit for this resource.',
            'resource' => $this->resource,
            'limit' => $this->limit,
            'used' => $this->used,
            'upgrade_required' => $this->upgradeRequired?->value,
        ], 422);
    }
}