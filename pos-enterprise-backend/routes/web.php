<?php
use Illuminate\Support\Facades\Route;

// Catch-all route to serve the React SPA for Web Admin
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');
