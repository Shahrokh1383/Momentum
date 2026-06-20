<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Habit\StoreHabitRequest;
use App\Http\Requests\User\Habit\UpdateHabitRequest;
use App\Http\Resources\User\HabitResource;
use App\Models\Habit;
use App\Models\Tag;
use App\Services\User\Subscription\PlanQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HabitController extends Controller
{
    public function __construct(
        private PlanQuotaService $quotaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $habits = $request->user()->habits()
            ->with('category', 'tags')
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse(
            HabitResource::collection($habits),
            'Active habits retrieved successfully.'
        );
    }

    public function archived(Request $request): JsonResponse
    {
        $habits = $request->user()->habits()
            ->onlyArchived()
            ->with('category', 'tags')
            ->orderBy('archived_at', 'desc')
            ->get();

        return $this->successResponse(
            HabitResource::collection($habits),
            'Archived habits retrieved successfully.'
        );
    }

    public function store(StoreHabitRequest $request): JsonResponse
    {
        $data = $request->validated();
        $tagsInput = $data['tags'] ?? [];
        unset($data['tags']);

        $habit = $request->user()->habits()->create($data);
        
        $this->syncTags($habit, $tagsInput, $request->user()->id);

        return $this->successResponse(
            new HabitResource($habit->load('category', 'tags')),
            'Habit created successfully.',
            201
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        // Allow fetching a specific habit even if archived
        $habit = $request->user()->habits()
            ->withArchived()
            ->with('category', 'tags')
            ->findOrFail($id);

        return $this->successResponse(
            new HabitResource($habit),
            'Habit retrieved successfully.'
        );
    }

    public function update(UpdateHabitRequest $request, Habit $habit): JsonResponse
    {
        $data = $request->validated();
        $tagsInput = $data['tags'] ?? [];
        unset($data['tags']);

        $habit->update($data);
        
        if ($request->has('tags')) {
            $this->syncTags($habit, $tagsInput, $request->user()->id);
        }

        return $this->successResponse(
            new HabitResource($habit->load('category', 'tags')),
            'Habit updated successfully.'
        );
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        $habit = $request->user()->habits()->findOrFail($id);

        if ($habit->archived_at !== null) {
            return $this->errorResponse('already_archived', 'Habit is already archived.', 422);
        }

        $habit->update(['archived_at' => now()]);

        return $this->successResponse(
            new HabitResource($habit),
            'Habit archived successfully.'
        );
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $habit = $request->user()->habits()
            ->withArchived()
            ->whereNotNull('archived_at')
            ->findOrFail($id);

        // Restoring makes it active again, so we MUST check the quota first
        $this->quotaService->ensureLimitNotExceeded($request->user(), 'habits', 'max_active_habits');

        $habit->update(['archived_at' => null]);

        return $this->successResponse(
            new HabitResource($habit->load('category', 'tags')),
            'Habit restored successfully.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $habit = $request->user()->habits()
            ->withArchived()
            ->findOrFail($id);

        $habit->forceDelete();

        return $this->successResponse(null, 'Habit permanently deleted.');
    }

    /**
     * Helper to handle inline Tag Creation & Syncing
     */
    private function syncTags(Habit $habit, array $tagsInput, int $userId): void
    {
        $tagIds = [];
        
        foreach ($tagsInput as $tag) {
            if (is_numeric($tag)) {
                // Existing Tag ID
                $tagModel = Tag::where('id', $tag)->where('user_id', $userId)->first();
                if ($tagModel) {
                    $tagIds[] = $tagModel->id;
                }
            } else {
                // New Tag Name (Inline Creation)
                $tagModel = Tag::firstOrCreate(
                    ['user_id' => $userId, 'slug' => Str::slug($tag)],
                    ['name' => $tag, 'color' => '#6B7280'] // Default color
                );
                $tagIds[] = $tagModel->id;
            }
        }

        $habit->tags()->sync(array_unique($tagIds));
    }
}