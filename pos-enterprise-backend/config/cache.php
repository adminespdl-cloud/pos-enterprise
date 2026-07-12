<?php

return [
    'default' => env('CACHE_DRIVER', 'redis'),
    'stores' => [
        'redis' => [
            'driver'     => 'redis',
            'connection' => 'cache',
            'lock_connection' => 'default',
        ],
        'file' => [
            'driver' => 'file',
            'path'   => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],
    ],
    'prefix' => env('CACHE_PREFIX', 'pos_cache'),
];
