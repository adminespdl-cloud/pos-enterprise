<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{DB, Schema};

return new class extends Migration
{
    public function up(): void
    {
        // Setup PostgreSQL extensions required for advanced constraints
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');

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
            $table->enum('role', ['super_admin', 'admin', 'manager', 'cashier'])->default('cashier');
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
        // 6. CATEGORIES (Self-referential)
        // ============================================================
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable();
            $table->string('name', 100);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'name', 'parent_id']);
            $table->index(['company_id', 'parent_id', 'sort_order']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('categories')->nullOnDelete();
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
            $table->enum('status', ['active', 'inactive', 'deleted'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'category_id']);
            $table->index(['company_id', 'barcode']);
            $table->index(['company_id', 'sku']);
            $table->index('updated_at'); // Untuk delta sync
        });

        // ============================================================
        // 8. PRODUCT_VARIANTS
        // ============================================================
        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 50)->nullable();
            $table->string('barcode', 50)->nullable();
            $table->jsonb('attributes')->default('{}'); // {"size":"Large","flavor":"Vanilla"}
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['product_id', 'sku']);
            $table->index(['product_id', 'is_active']);
        });

        // ============================================================
        // 9. INVENTORY_STOCKS
        // ============================================================
        Schema::create('inventory_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->foreignUuid('outlet_id')->constrained('outlets')->cascadeOnDelete();
            $table->decimal('quantity', 12, 3)->default(0);
            $table->decimal('minimum_stock', 12, 3)->default(0);
            $table->timestamp('updated_at')->useCurrent();

            // Satu baris per (produk, varian, outlet)
            $table->unique(['product_id', 'variant_id', 'outlet_id']);
        });

        // ============================================================
        // 10. INVENTORY_MOVEMENTS (Append-only audit log)
        // ============================================================
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outlet_id')->constrained('outlets');
            $table->foreignUuid('product_id')->constrained('products');
            $table->foreignUuid('variant_id')->nullable()->constrained('product_variants');
            $table->enum('type', [
                'purchase','sale','void','transfer_in','transfer_out',
                'adjustment','opname','opening_stock'
            ]);
            $table->decimal('quantity', 12, 3); // negatif = keluar
            $table->decimal('quantity_before', 12, 3);
            $table->decimal('quantity_after', 12, 3);
            $table->uuid('reference_id')->nullable();  // transaction_id, grn_id, etc.
            $table->string('reference_type', 50)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['outlet_id', 'product_id', 'created_at']);
            $table->index(['outlet_id', 'created_at']);
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
            $table->enum('tier', ['bronze', 'silver', 'gold', 'platinum'])->default('bronze');
            $table->unsignedInteger('total_transaction_count')->default(0);
            $table->decimal('total_transaction_amount', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('registered_at_outlet_id')->nullable()->constrained('outlets')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'phone']);
            $table->unique(['company_id', 'email']);
            $table->index(['company_id', 'tier']);
        });

        // ============================================================
        // 12. POINT_TRANSACTIONS
        // ============================================================
        Schema::create('point_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->constrained('members')->cascadeOnDelete();
            $table->foreignUuid('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->enum('type', ['earn', 'redeem', 'adjustment', 'expire']);
            $table->bigInteger('points'); // negatif = redeem/expire
            $table->unsignedBigInteger('balance_after');
            $table->string('description', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['member_id', 'created_at']);
        });

        // ============================================================
        // 13. VOUCHERS
        // ============================================================
        Schema::create('vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('code', 50);
            $table->enum('type', ['nominal', 'percent']);
            $table->decimal('value', 15, 2);
            $table->decimal('min_transaction', 15, 2)->default(0);
            $table->decimal('max_discount', 15, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->jsonb('applicable_outlets')->nullable(); // null = semua outlet
            $table->timestamp('valid_from');
            $table->timestamp('valid_until');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'is_active', 'valid_until']);
        });

        // ============================================================
        // 14. SHIFTS
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
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->text('notes')->nullable();
            $table->timestamps();

            // PostgreSQL EXCLUDE constraint: kasir hanya bisa punya 1 shift open per outlet
            // Diimplementasikan via raw SQL di DatabaseSeeder / migration lanjutan
            $table->index(['outlet_id', 'status']);
            $table->index(['cashier_id', 'status']);
        });

        // EXCLUDE constraint untuk mencegah duplikasi shift open
        DB::statement("
            ALTER TABLE shifts
            ADD CONSTRAINT shifts_one_open_per_cashier_outlet
            EXCLUDE USING gist (
                cashier_id WITH =,
                outlet_id WITH =,
                (status = 'open') WITH =
            ) WHERE (status = 'open')
        ");

        // ============================================================
        // 15. TRANSACTIONS (Partitioned, append-only)
        // ============================================================
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('outlet_id')->constrained('outlets');
            $table->foreignUuid('shift_id')->nullable()->constrained('shifts');
            $table->foreignUuid('cashier_id')->constrained('users');
            $table->foreignUuid('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->string('transaction_number', 50)->unique();
            $table->enum('status', ['completed', 'voided', 'pending_sync'])->default('completed');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->unsignedInteger('points_earned')->default(0);
            $table->unsignedInteger('points_redeemed')->default(0);
            $table->text('void_reason')->nullable();
            $table->foreignUuid('voided_by')->nullable()->constrained('users');
            $table->timestamp('voided_at')->nullable();
            $table->string('device_id', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['outlet_id', 'status', 'created_at']);
            $table->index(['shift_id']);
            $table->index(['member_id', 'created_at']);
            $table->index(['cashier_id', 'created_at']);
        });

        // ============================================================
        // 16. TRANSACTION_ITEMS
        // ============================================================
        Schema::create('transaction_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products');
            $table->foreignUuid('variant_id')->nullable()->constrained('product_variants');
            // Snapshot nama produk pada saat transaksi (immutable)
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
        });

        // ============================================================
        // 17. PAYMENTS
        // ============================================================
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->enum('method', ['cash', 'qris', 'transfer', 'voucher', 'points']);
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
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['outlet_id', 'device_id']);
        });

        // ============================================================
        // 19. AUDIT_LOGS
        // ============================================================
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('company_id')->nullable()->constrained('companies');
            $table->foreignUuid('user_id')->nullable()->constrained('users');
            $table->string('action', 100);       // e.g. "transaction.created"
            $table->string('entity_type', 100);  // e.g. "Transaction"
            $table->uuid('entity_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('device_id', 100)->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['company_id', 'entity_type', 'entity_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('sync_logs');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('transaction_items');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('point_transactions');
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
