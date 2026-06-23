<?php

namespace App\Http\Controllers\User\Taxonomy;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Tag\StoreTagRequest;
use App\Http\Requests\User\Tag\UpdateTagRequest;
use App\Http\Resources\User\TagResource;
use App\Models\Taxonomy\Tag;
use App\Services\User\Taxonomy\TagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function __construct(
        private TagService $tagService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tags = $this->tagService->getTags($request->user());

        return $this->successResponse(
            TagResource::collection($tags),
            'Tags retrieved successfully.'
        );
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = $this->tagService->createTag($request->user(), $request->validated());

        return $this->successResponse(
            new TagResource($tag),
            'Tag created successfully.',
            201
        );
    }

    public function update(UpdateTagRequest $request, Tag $tag): JsonResponse
    {
        $tag = $this->tagService->updateTag($tag, $request->validated());

        return $this->successResponse(
            new TagResource($tag),
            'Tag updated successfully.'
        );
    }

    public function destroy(Request $request, Tag $tag): JsonResponse
    {
        // Delegated to service to ensure ownership validation and SRP
        $this->tagService->deleteTag($request->user(), $tag->id);

        return $this->successResponse(null, 'Tag deleted successfully.');
    }

    public function autocomplete(Request $request): JsonResponse
    {
        $query = $request->get('q', '');
        $tags = $this->tagService->getAutocompleteTags($request->user(), $query);

        return $this->successResponse(
            TagResource::collection($tags),
            'Tag suggestions retrieved successfully.'
        );
    }
}