<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'POS Enterprise API',
        'status' => 'active',
        'version' => '1.0.0',
        'environment' => config('app.env'),
        'timestamp' => now()->toIso8601String(),
    ]);
});
