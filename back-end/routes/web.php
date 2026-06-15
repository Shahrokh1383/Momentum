<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['message' => 'Web fallback route hit. Check your request URL or method.']);
});