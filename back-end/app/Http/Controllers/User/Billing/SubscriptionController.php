<?php

namespace App\Http\Controllers\User\Billing;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Subscription\UpgradeSubscriptionRequest;
use App\Http\Resources\User\PaymentResource;
use App\Http\Resources\User\PlanResource;
use App\Http\Resources\User\SubscriptionResource;
use App\Services\User\Billing\PaymenterService;
use App\Services\User\Billing\PlanQuotaService;
use App\Services\User\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private PlanQuotaService $quotaService,
        private PaymenterService $paymenterService   // ✅ Added
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
            // 1. Create subscription (no payment yet)
            $subscription = $this->subscriptionService->upgrade(
                $request->user(),
                $request->plan()
            );

            // 2. Delegate payment initiation to PaymenterService
            $callbackUrl = route('payment.callback', ['ref' => $subscription->transaction_ref]);
            $amount = $this->resolveAmountForPlan($request->plan());

            $payment = $this->paymenterService->initiatePayment(
                $subscription,
                $amount,
                $callbackUrl
            );

            $gatewayResponse = $payment->gateway_response;
            return $this->successResponse([
                'payment_url' => $gatewayResponse['payment_url'] ?? null,
            ], 'Redirecting to secure payment gateway.', 202);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse('upgrade_failed', $e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse('payment_error', $e->getMessage(), 502);
        }
    }

    public function verify(Request $request, string $transactionId): JsonResponse
    {
        $payment = $this->paymenterService->getPaymentByTransactionId($transactionId);

        if (! $payment) {
            return $this->errorResponse('not_found', 'Payment not found.', 404);
        }

        $status = $payment->status->value;
        $message = match ($status) {
            'success' => 'Payment confirmed. Subscription activated.',
            'pending' => 'Payment is still being processed.',
            'failed'  => 'Payment failed.',
            'refunded'=> 'Payment has been refunded.',
            default   => 'Unknown status.',
        };

        $data = ['status' => $status];
        if ($payment->subscription) {
            $data['subscription'] = new SubscriptionResource($payment->subscription->load('planDetails'));
        }
        $data['payment'] = new PaymentResource($payment);

        return $this->successResponse($data, $message);
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
                    'status'    => $result['payment']->status->value,
                    'amount'    => $result['payment']->amount,
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

    private function resolveAmountForPlan(\App\Enums\Billing\PlanSlug $planSlug): float
    {
        $plan = \App\Models\Billing\Plan::where('slug', $planSlug->value)->first();
        if (!$plan) {
            throw new \InvalidArgumentException('Plan not found.');
        }
        return match ($planSlug) {
            \App\Enums\Billing\PlanSlug::EXPERT  => (float) ($plan->price_monthly ?? 0.00),
            \App\Enums\Billing\PlanSlug::PREMIUM => (float) ($plan->price_monthly ?? 0.00),
            default => 0.00,
        };
    }
}