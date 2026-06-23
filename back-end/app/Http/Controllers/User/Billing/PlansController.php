<?php

namespace App\Http\Controllers\User\Billing;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\PlanResource;
use App\Models\Billing\Plan; 
use Illuminate\Http\JsonResponse;

class PlansController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::all();

        return $this->successResponse(
            PlanResource::collection($plans),
            'Available plans retrieved.'
        );
    }
}