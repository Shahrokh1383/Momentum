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
    ) {}

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
                $request->plan()
            );

            return $this->successResponse([
                'payment_url' => $result['payment_url'],
            ], 'Redirecting to secure payment gateway.', 202);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('upgrade_failed', $e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('payment_error', $e->getMessage(), 502);
        }
    }

    public function verify(Request $request, int $transactionId): JsonResponse
    {
        try {
            $result = $this->subscriptionService->verify($request->user(), $transactionId);

            $statusCode = match ($result['status']) {
                'confirmed', 'already_confirmed' => 200,
                'pending' => 200,
                'failed' => 200,
                default => 200,
            };

            $message = match ($result['status']) {
                'confirmed' => 'Payment confirmed. Subscription activated.',
                'already_confirmed' => 'Payment was already confirmed.',
                'pending' => 'Payment is still being processed.',
                'failed' => 'Payment failed.',
                default => 'Unknown status.',
            };

            $data = ['status' => $result['status']];

            if (isset($result['subscription'])) {
                $data['subscription'] = new SubscriptionResource($result['subscription']->load('planDetails'));
            }

            if (isset($result['payment'])) {
                $data['payment'] = [
                    'gateway_transaction_id' => $result['payment']->gateway_transaction_id,
                    'status' => $result['payment']->status->value,
                    'amount' => $result['payment']->amount,
                    'paid_at' => $result['payment']->paid_at,
                ];
            }

            return $this->successResponse($data, $message, $statusCode);

        } catch (\Exception $e) {
            return $this->errorResponse('verify_error', $e->getMessage(), 502);
        }
    }

    public function cancel(Request $request): JsonResponse
    {
        try {
            $result = $this->subscriptionService->cancel($request->user());

            $data = [
                'subscription' => new SubscriptionResource($result['subscription']->load('planDetails')),
            ];

            if ($result['payment']) {
                $data['refund'] = [
                    'status' => $result['payment']->status->value,
                    'amount' => $result['payment']->amount,
                    'refunded_at' => $result['payment']->refunded_at,
                ];
            }

            return $this->successResponse($data, 'Subscription cancelled and refund initiated.');

        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('cancel_failed', $e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('refund_error', $e->getMessage(), 502);
        }
    }

    public function quotas(Request $request): JsonResponse
    {
        $user = $request->user();
        $plan = $this->quotaService->getPlan($user);

        $freezeLimit = $this->quotaService->getLimit($user, 'max_freezes_per_week');

        $limits = [
            'max_active_habits' => $this->quotaService->getLimit($user, 'max_active_habits'),
            'max_groups' => $this->quotaService->getLimit($user, 'max_groups'),
            'max_categories' => $this->quotaService->getLimit($user, 'max_categories'),
            'max_freezes_per_week' => $freezeLimit,
            'max_photos_per_log' => $this->quotaService->getLimit($user, 'max_photos_per_log'),
            'max_pdfs_per_month' => $this->quotaService->getLimit($user, 'max_pdfs_per_month'),
        ];

        $usage = [
            'habits' => $this->quotaService->getUsage($user, 'habits'),
            'groups' => $this->quotaService->getUsage($user, 'groups'),
            'categories' => $this->quotaService->getUsage($user, 'categories'),
        ];

        $features = [
            'advanced_analytics' => $this->quotaService->isFeatureEnabled($user, 'has_advanced_analytics'),
            'insights' => $this->quotaService->isFeatureEnabled($user, 'has_insights'),
            'predictive_insights' => $this->quotaService->isFeatureEnabled($user, 'has_predictive_insights'),
            'smart_reminders' => $this->quotaService->isFeatureEnabled($user, 'has_smart_reminders'),
            'xp_booster' => $this->quotaService->isFeatureEnabled($user, 'has_xp_booster'),
        ];

        return $this->successResponse([
            'plan' => new PlanResource($plan),
            'limits' => $limits,
            'usage' => $usage,
            'features' => $features,
            'freezes' => [
                'used' => $user->streakFreezes()
                    ->whereBetween('frozen_date', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count(),
                'limit' => $freezeLimit,
                'unlimited' => $freezeLimit === -1,
            ],
            'allowed_habit_types' => explode(',', $plan->allowed_habit_types),
        ], 'User quota and feature information retrieved.');
    }
}