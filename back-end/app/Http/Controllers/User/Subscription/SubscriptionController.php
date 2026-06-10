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
                $request->plan(),
                $request->validated('card_number')
            );

            return $this->successResponse([
                'subscription' => new SubscriptionResource($result['subscription']->load('planDetails')),
                'payment' => [
                    'gateway_transaction_id' => $result['payment']->gateway_transaction_id,
                    'status' => $result['payment']->status->value,
                    'amount' => $result['payment']->amount,
                    'currency' => $result['payment']->currency,
                    'card' => $result['payment']->card_number_masked,
                ],
            ], 'Payment initiated. Awaiting gateway confirmation.', 202);

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
        ], 'User quota and feature information retrieved.');
    }
}