# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════
# POS Enterprise — Backend Dockerfile (Multi-stage)
# Stage 1: composer install  → Stage 2: production image (PHP-FPM)
# ═══════════════════════════════════════════════════════════════════

# ── Stage 1: Composer Dependencies ───────────────────────────────
FROM composer:2.7 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# ── Stage 2: Production PHP-FPM Image ────────────────────────────
FROM php:8.3-fpm-alpine AS production

LABEL org.opencontainers.image.title="POS Enterprise Backend"
LABEL org.opencontainers.image.description="Laravel 12 API — POS Enterprise"

# System dependencies
RUN apk add --no-cache \
    libpq-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        zip \
        gd \
        intl \
        mbstring \
        exif \
        pcntl \
        bcmath \
        opcache

# Install Redis extension
RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# OPcache configuration for production
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.interned_strings_buffer=16" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.revalidate_freq=0" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini

# PHP-FPM configuration
RUN echo "pm = dynamic" > /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_children = 20" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.start_servers = 5" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.min_spare_servers = 3" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_spare_servers = 10" >> /usr/local/etc/php-fpm.d/www.conf

# Create non-root user
RUN addgroup -g 1000 laravel && adduser -u 1000 -G laravel -s /bin/sh -D laravel

WORKDIR /var/www/html

# Copy vendor from stage 1
COPY --from=vendor --chown=laravel:laravel /app/vendor ./vendor

# Copy application
COPY --chown=laravel:laravel . .

# Create required directories
RUN mkdir -p storage/app/public \
             storage/framework/cache \
             storage/framework/sessions \
             storage/framework/views \
             storage/logs \
             bootstrap/cache \
    && chown -R laravel:laravel storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy entrypoint
COPY --chown=laravel:laravel docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER laravel

EXPOSE 9000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
