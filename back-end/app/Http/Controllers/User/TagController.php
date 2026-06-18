<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\Tag\StoreTagRequest;
use App\Http\Requests\User\Tag\UpdateTagRequest;
use App\Http\Resources\User\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tags = $request->user()->tags()->orderBy('name')->get();

        return $this->successResponse(
            TagResource::collection($tags),
            'Tags retrieved successfully.'
        );
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = $request->user()->tags()->create($request->validated());

        return $this->successResponse(
            new TagResource($tag),
            'Tag created successfully.',
            201
        );
    }

    public function update(UpdateTagRequest $request, Tag $tag): JsonResponse
    {
        $tag->update($request->validated());

        return $this->successResponse(
            new TagResource($tag),
            'Tag updated successfully.'
        );
    }

    public function destroy(Request $request, Tag $tag): JsonResponse
    {
        if ($tag->user_id !== $request->user()->id) {
            return $this->errorResponse('forbidden', 'You do not own this tag.', 403);
        }

        $tag->delete();

        return $this->successResponse(null, 'Tag deleted successfully.');
    }

    public function autocomplete(Request $request): JsonResponse
    {
        $query = $request->get('q', '');

        $tags = $request->user()->tags()
            ->where('name', 'like', "%{$query}%")
            ->limit(10)
            ->get();

        return $this->successResponse(
            TagResource::collection($tags),
            'Tag suggestions retrieved successfully.'
        );
    }
}