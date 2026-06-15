<?php
use Illuminate\Support\Facades\Route;

// Auth routes -> final prefix: /api/auth
Route::prefix('auth')->group(base_path('routes/api/auth.php'));

// User routes -> final prefix: /api/user
Route::prefix('user')->group(base_path('routes/api/user.php'));

// Admin routes -> final prefix: /api/admin
Route::prefix('admin')->group(base_path('routes/api/admin.php'));