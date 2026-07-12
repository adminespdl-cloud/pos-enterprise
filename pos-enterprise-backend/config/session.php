<?php

return [
    'default'    => env('SESSION_DRIVER', 'redis'),
    'lifetime'   => env('SESSION_LIFETIME', 480),
    'encrypt'    => env('SESSION_ENCRYPT', false),
    'files'      => storage_path('framework/sessions'),
    'connection' => env('SESSION_CONNECTION'),
    'table'      => env('SESSION_TABLE', 'sessions'),
    'store'      => env('SESSION_STORE'),
    'lottery'    => [2, 100],
    'cookie'     => env('SESSION_COOKIE', 'pos_session'),
    'path'       => '/',
    'domain'     => env('SESSION_DOMAIN'),
    'secure'     => env('SESSION_SECURE_COOKIE', true),
    'http_only'  => env('SESSION_HTTP_ONLY', true),
    'same_site'  => env('SESSION_SAME_SITE', 'lax'),
    'partitioned'=> false,
];
