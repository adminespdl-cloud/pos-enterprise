#!/bin/sh
set -e

echo "🚀 Starting POS Enterprise Backend..."

# Cache configs untuk performa
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Jalankan migrasi (aman karena idempotent)
php artisan migrate --force

echo "✅ Ready!"
exec "$@"
