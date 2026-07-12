<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{DB, Schema};

return new class extends Migration
{
    public function up(): void
    {
        // ============================================================
        // 1. COMPANIES
        // ============================================================
        Schema::create('companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique()->nullable();
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('logo_url')->nullable();
            $table->string('timezone', 50)->default('Asia/Jakarta');
            $table->string('currency', 10)->default('IDR');
            $table->jsonb('settings')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ============================================================
        // 2. OUTLETS
        // ============================================================
        Schema::create('outlets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->string('qris_image_url')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 50)->nullable();
            $table->string('bank_account_name', 100)->nullable();
            $table->jsonb('operating_hours')->default('{}');
            $table->jsonb('active_payment_methods')->default('["cash","qris","transfer"]');
            $table->jsonb('settings')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // ============================================================
        // 3. USERS
        // ============================================================
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name');
            $table->string('email', 100)->unique()->nullable();
            $table->string('phone', 20)->unique()->nullable();
            $table->string('password_hash', 255)->nullable();
            $table->string('pin_hash', 255)->nullable();
            $table->string('role', 20)->default('cashier'); // super_admin, admin, manager, cashier
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->smallInteger('login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'role']);
        });

        // ============================================================
        // 4. USER_OUTLETS (Pivot)
        // ============================================================
        Schema::create('user_outlets', function (Blueprint $table) {
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('outlet_id')->constrained('outlets')->cascadeOnDelete();
            $table->primary(['user_id', 'outlet_id']);
        });

        // ============================================================
        // 5. SANCTUM TOKENS (Personal Access Tokens)
        // ============================================================
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // ============================================================
        // 6. CATEGORIES
        // parent_id is a plain UUID column, no FK constraint to avoid
        // PostgreSQL self-referential issues. App logic handles integrity.
        // ============================================================
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable()->index();
            $table->string('name', 100);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'parent_id', 'sort_order']);
        });

        // ============================================================
        // 7. PRODUCTS
        // ============================================================
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name', 200);
            $table->text('description')->nullable();
            $table->string('barcode', 50)->nullable();
            $table->string('sku', 50)->nullable();
            $table->decimal('base_price', 15, 2)->default(0);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->string('unit', 20)->default('pcs');
            $table->string('image_url')->nullable();
            $table->boolean('is_track_stock')->default(true);
            $table->boolean('has_variants')->default(false);
            $table->string('status', 20)->default('active'); // active, inactive, deleted
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'category_id']);
            $table->index(['company_id', 'barcode']);
            $table->index(['company_id', 'sku']);
            $table->index('updated_at');
        });

        // ============================================================
        // 8. PRODUCT_VARIANTS
        // ============================================================
        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 50)->nullable();
            $table->string('barcode', 50)->nullable();
            $table->jsonb('attributes')->default('{}');
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['product_id', 'is_active']);
        });

        // ============================================================
        // 9. INVENTORY_STOCKS
        // ============================================================
        Schema::create('inventory_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->uuid('variant_id')->nullable();
            $table->foreignUuid('outlet_id')->constrained('outlets')->cascadeOnDelete();
            $table->decimal('quantity', 12, 3)->default(0);
            $table->decimal('minimum_stock', 12, 3)->default(0);
            $table->timestamp('updated_at')->useCurrent();

            $table->unique(['product_id', 'variant_id', 'outlet_id']);
            $table->foreign('variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
        });

        // ============================================================
        // 10. INVENTORY_MOVEMENTS (Append-only audit log)
        // ============================================================
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outlet_id')->constrained('outlets');
            $table->foreignUuid('product_id')->constrained('products');
            $table->uuid('variant_id')->nullable();
            $table->string('type', 30); // purchase, sale, void, transfer_in, transfer_out, adjustment, opname, opening_stock
            $table->decimal('quantity', 12, 3);
            $table->decimal('quantity_before', 12, 3);
            $table->decimal('quantity_after', 12, 3);
            $table->uuid('reference_id')->nullable();
            $table->string('reference_type', 50)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['outlet_id', 'product_id', 'created_at']);
            $table->index(['outlet_id', 'created_at']);
            $table->foreign('variant_id')->references('id')->on('product_variants');
        });

        // ============================================================
        // 11. MEMBERS
        // ============================================================
        Schema::create('members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->date('birth_date')->nullable();
            $table->unsignedBigInteger('points_balance')->default(0);
            $table->string('tier', 20)->default('bronze'); // bronze, silver, gold, platinum
            $table->unsignedInteger('total_transaction_count')->default(0);
            $table->decimal('total_transaction_amount', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->uuid('registered_at_outlet_id')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'phone']);
            $table->unique(['company_id', 'email']);
            $table->index(['company_id', 'tier']);
            $table->foreign('registered_at_outlet_id')->references('id')->on('outlets')->nullOnDelete();
        });

        // ============================================================
        // 12. VOUCHERS
        // ============================================================
        Schema::create('vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('type', 20); // nominal, percent
            $table->decimal('value', 15, 2);
            $table->decimal('min_transaction', 15, 2)->default(0);
            $table->decimal('max_discount', 15, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->jsonb('applicable_outlets')->nullable();
            $table->timestamp('valid_from');
            $table->timestamp('valid_until');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'is_active', 'valid_until']);
        });

        // ============================================================
        // 13. SHIFTS
        // ============================================================
        Schema::create('shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outlet_id')->constrained('outlets')->cascadeOnDelete();
            $table->foreignUuid('cashier_id')->constrained('users');
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_cash', 15, 2)->default(0);
            $table->decimal('closing_cash', 15, 2)->nullable();
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('cash_difference', 15, 2)->nullable();
            $table->string('status', 10)->default('open'); // open, closed
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['outlet_id', 'status']);
            $table->index(['cashier_id', 'status']);
        });

        // Partial unique index: kasir hanya bisa punya 1 shift open per outlet
        // Simpler and more compatible than EXCLUDE USING gist
        DB::statement("
            CREATE UNIQUE INDEX shifts_one_open_per_cashier_outlet
            ON shifts (cashier_id, outlet_id)
            WHERE status = 'open'
        ");

        // ============================================================
        // 14. TRANSACTIONS
        // MUST be created BEFORE point_transactions
        // ============================================================
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outlet_id')->constrained('outlets');
            $table->foreignUuid('shift_id')->nullable()->constrained('shifts');
            $table->foreignUuid('cashier_id')->constrained('users');
            $table->uuid('member_id')->nullable();
            $table->string('transaction_number', 50)->unique();
            $table->string('status', 20)->default('completed'); // completed, voided, pending_sync
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->unsignedInteger('points_earned')->default(0);
            $table->unsignedInteger('points_redeemed')->default(0);
            $table->text('void_reason')->nullable();
            $table->uuid('voided_by')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->string('device_id', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['outlet_id', 'status', 'created_at']);
            $table->index(['shift_id']);
            $table->index(['member_id', 'created_at']);
            $table->index(['cashier_id', 'created_at']);
            $table->foreign('member_id')->references('id')->on('members')->nullOnDelete();
            $table->foreign('voided_by')->references('id')->on('users');
        });

        // ============================================================
        // 15. POINT_TRANSACTIONS
        // Now AFTER transactions table exists
        // ============================================================
        Schema::create('point_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->constrained('members')->cascadeOnDelete();
            $table->uuid('transaction_id')->nullable();
            $table->string('type', 20); // earn, redeem, adjustment, expire
            $table->bigInteger('points');
            $table->unsignedBigInteger('balance_after');
            $table->string('description', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['member_id', 'created_at']);
            $table->foreign('transaction_id')->references('id')->on('transactions')->nullOnDelete();
        });

        // ============================================================
        // 16. TRANSACTION_ITEMS
        // ============================================================
        Schema::create('transaction_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products');
            $table->uuid('variant_id')->nullable();
            $table->string('product_name', 200);
            $table->string('product_sku', 50)->nullable();
            $table->string('variant_name', 200)->nullable();
            $table->decimal('unit_price', 15, 2);
            $table->decimal('qty', 10, 3);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('subtotal', 15, 2);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['transaction_id']);
            $table->foreign('variant_id')->references('id')->on('product_variants');
        });

        // ============================================================
        // 17. PAYMENTS
        // ============================================================
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->string('method', 20); // cash, qris, transfer, voucher, points
            $table->decimal('amount', 15, 2);
            $table->string('reference_number', 100)->nullable();
            $table->string('voucher_code', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['transaction_id']);
        });

        // ============================================================
        // 18. SYNC_LOGS
        // ============================================================
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outlet_id')->constrained('outlets')->cascadeOnDelete();
            $table->string('device_id', 100);
            $table->timestamp('last_push_at')->nullable();
            $table->timestamp('last_pull_at')->nullable();
            $table->unsignedInteger('pending_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('updated_at')->useCurrent();

            $table->unique(['outlet_id', 'device_id']);
        });

        // ============================================================
        // 19. AUDIT_LOGS
        // ============================================================
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('company_id')->nullable();
            $table->uuid('user_id')->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 100);
            $table->uuid('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('device_id', 100)->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['company_id', 'entity_type', 'entity_id']);
            $table->index(['user_id', 'created_at']);
            $table->foreign('company_id')->references('id')->on('companies');
            $table->foreign('user_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('sync_logs');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('transaction_items');
        Schema::dropIfExists('point_transactions');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('members');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_stocks');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('user_outlets');
        Schema::dropIfExists('users');
        Schema::dropIfExists('outlets');
        Schema::dropIfExists('companies');
    }
};
