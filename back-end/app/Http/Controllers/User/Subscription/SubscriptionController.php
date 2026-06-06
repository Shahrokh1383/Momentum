<?php

namespace App\Http\Controllers\User\Subscription;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Subscription\UpgradeSubscriptionRequest;
use App\Http\Resources\User\PlanResource;
use App\Http\Resources\User\SubscriptionResource;
use App\Services\User\Subscription\PlanQuotaService;
use App\Services\User\Subscription\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private PlanQuotaService $quotaService
    ) {
    }

    public function current(Request $request): JsonResponse
    {
        $subscription = $this->subscriptionService->getCurrent($request->user());

        if (! $subscription) {
            return $this->errorResponse('no_subscription', 'No active subscription found.', 404);
        }

        return $this->successResponse(
            new SubscriptionResource($subscription->load('planDetails')),
            'Current subscription retrieved.'
        );
    }

    public function upgrade(UpgradeSubscriptionRequest $request): JsonResponse
    {
        try {
            $result = $this->subscriptionService->upgrade(
                $request->user(),
                $request->plan(),
                $request->validated('payment_method', 'simulated')
            );

            return $this->successResponse([
                'subscription' => new SubscriptionResource($result['subscription']->load('planDetails')),
                'payment' => $result['payment']->only(['id', 'status', 'amount', 'currency', 'provider_ref']),
            ], 'Subscription upgrade initiated. Payment is being processed.', 202);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('upgrade_failed', $e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('internal_error', 'An error occurred during upgrade.', 500);
        }
    }

    public function cancel(Request $request): JsonResponse
    {
        try {
            $subscription = $this->subscriptionService->cancel($request->user());

            return $this->successResponse(
                new SubscriptionResource($subscription->load('planDetails')),
                'Subscription cancelled successfully. Access remains until expiration.'
            );
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('cancel_failed', $e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('internal_error', 'An error occurred during cancellation.', 500);
        }
    }

    public function quotas(Request $request): JsonResponse
    {
        $user = $request->user();
        $plan = $this->quotaService->getUserPlan($user);

        return $this->successResponse([
            'plan' => $plan ? new PlanResource($plan) : null,
            'limits' => [
                'max_active_habits' => $plan?->max_active_habits ?? 5,
                'max_groups' => $plan?->max_groups ?? 1,
                'max_freezes_per_week' => $plan?->max_freezes_per_week ?? 1,
                'max_photos_per_log' => $plan?->max_photos_per_log ?? 1,
                'max_pdfs_per_month' => $plan?->max_pdfs_per_month ?? 1,
            ],
            'features' => [
                'advanced_analytics' => $this->quotaService->hasFeature($user, 'advanced_analytics'),
                'insights' => $this->quotaService->hasFeature($user, 'insights'),
                'xp_booster' => $this->quotaService->hasFeature($user, 'xp_booster'),
                'unlimited_photos' => $this->quotaService->hasFeature($user, 'unlimited_photos'),
            ],
            'usage' => [
                'habits_remaining' => null,
                'groups_remaining' => null,
                'photos_remaining' => null,
                'pdfs_remaining' => null,
            ],
        ], 'User quota and feature information retrieved.');
    }
}