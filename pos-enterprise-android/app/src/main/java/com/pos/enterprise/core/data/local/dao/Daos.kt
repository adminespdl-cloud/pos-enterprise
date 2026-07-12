package com.pos.enterprise.core.data.local.dao

import androidx.room.*
import com.pos.enterprise.core.data.local.entity.*
import kotlinx.coroutines.flow.Flow

// ═══════════════════════════════════════════════════════════════════
// PRODUCT DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface ProductDao {

    @Query("""
        SELECT p.*, 
               COALESCE(s.quantity, 0) AS stock,
               COALESCE(s.minimum_stock, 0) AS min_stock
        FROM products p
        LEFT JOIN inventory_stocks s 
            ON s.product_id = p.id AND s.variant_id_or_null = 'null'
        WHERE p.status = 'active' 
          AND p.is_deleted = 0
          AND (:categoryId IS NULL OR p.category_id = :categoryId)
          AND (:search IS NULL OR p.name LIKE '%' || :search || '%' 
               OR p.barcode = :search OR p.sku LIKE '%' || :search || '%')
        ORDER BY p.name ASC
        LIMIT :limit OFFSET :offset
    """)
    fun getProducts(
        categoryId: String? = null,
        search: String? = null,
        limit: Int = 50,
        offset: Int = 0,
    ): Flow<List<ProductWithStock>>

    @Query("SELECT * FROM products WHERE barcode = :barcode AND is_deleted = 0 LIMIT 1")
    suspend fun getByBarcode(barcode: String): ProductEntity?

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: String): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(products: List<ProductEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(product: ProductEntity)

    @Query("UPDATE products SET is_deleted = 1, status = 'deleted' WHERE id = :id")
    suspend fun softDelete(id: String)

    @Query("SELECT MAX(updated_at) FROM products")
    suspend fun getLastUpdatedAt(): Long?

    @Transaction
    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductWithVariants(id: String): ProductWithVariants?

    @Query("SELECT COUNT(*) FROM products WHERE status = 'active' AND is_deleted = 0")
    suspend fun getActiveCount(): Int
}

// Data class gabungan produk + stok untuk UI kasir
data class ProductWithStock(
    @Embedded val product: ProductEntity,
    val stock: Double,
    val min_stock: Double,
)

// Data class produk + varian
data class ProductWithVariants(
    @Embedded val product: ProductEntity,
    @Relation(parentColumn = "id", entityColumn = "product_id")
    val variants: List<ProductVariantEntity>,
)

// ═══════════════════════════════════════════════════════════════════
// PRODUCT VARIANT DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface ProductVariantDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(variants: List<ProductVariantEntity>)

    @Query("SELECT * FROM product_variants WHERE product_id = :productId AND is_active = 1")
    suspend fun getByProduct(productId: String): List<ProductVariantEntity>
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(categories: List<CategoryEntity>)
}

// ═══════════════════════════════════════════════════════════════════
// INVENTORY STOCK DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface InventoryStockDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(stocks: List<InventoryStockEntity>)

    @Query("SELECT * FROM inventory_stocks WHERE product_id = :productId AND variant_id_or_null = :variantId")
    suspend fun getStock(productId: String, variantId: String = "null"): InventoryStockEntity?

    @Query("""
        UPDATE inventory_stocks 
        SET quantity = quantity - :qty 
        WHERE product_id = :productId AND variant_id_or_null = :variantId
    """)
    suspend fun decrementStock(productId: String, variantId: String = "null", qty: Double)

    @Query("""
        SELECT p.name, s.quantity, s.minimum_stock
        FROM inventory_stocks s
        JOIN products p ON p.id = s.product_id
        WHERE s.quantity <= s.minimum_stock AND s.minimum_stock > 0
        ORDER BY s.quantity ASC
        LIMIT 10
    """)
    fun getLowStockProducts(): Flow<List<LowStockItem>>
}

data class LowStockItem(val name: String, val quantity: Double, val minimum_stock: Double)

// ═══════════════════════════════════════════════════════════════════
// MEMBER DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface MemberDao {
    @Query("SELECT * FROM members WHERE phone LIKE '%' || :phone || '%' LIMIT 5")
    suspend fun searchByPhone(phone: String): List<MemberEntity>

    @Query("SELECT * FROM members WHERE id = :id")
    suspend fun getById(id: String): MemberEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(members: List<MemberEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(member: MemberEntity)

    @Query("UPDATE members SET points_balance = :newBalance WHERE id = :id")
    suspend fun updatePoints(id: String, newBalance: Long)

    @Query("SELECT MAX(updated_at) FROM members")
    suspend fun getLastUpdatedAt(): Long?
}

// ═══════════════════════════════════════════════════════════════════
// SHIFT DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface ShiftDao {
    @Query("SELECT * FROM shifts WHERE status = 'open' LIMIT 1")
    fun getActiveShift(): Flow<ShiftEntity?>

    @Query("SELECT * FROM shifts WHERE status = 'open' LIMIT 1")
    suspend fun getActiveShiftOnce(): ShiftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(shift: ShiftEntity)

    @Query("UPDATE shifts SET status = 'closed', closed_at = :closedAt, closing_cash = :closingCash, expected_cash = :expectedCash, cash_difference = :diff WHERE id = :id")
    suspend fun closeShift(id: String, closedAt: Long, closingCash: Long, expectedCash: Long, diff: Long)

    @Query("SELECT * FROM shifts ORDER BY opened_at DESC LIMIT 30")
    fun getRecentShifts(): Flow<List<ShiftEntity>>
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface TransactionDao {

    @Transaction
    @Query("""
        SELECT * FROM transactions 
        WHERE (:outletId IS NULL OR outlet_id = :outletId)
          AND (:status IS NULL OR status = :status)
          AND (:shiftId IS NULL OR shift_id = :shiftId)
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    fun getTransactions(
        outletId: String? = null,
        status: String? = null,
        shiftId: String? = null,
        limit: Int = 30,
        offset: Int = 0,
    ): Flow<List<TransactionWithDetails>>

    @Transaction
    @Query("SELECT * FROM transactions WHERE id = :id")
    suspend fun getById(id: String): TransactionWithDetails?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: TransactionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<TransactionItemEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayments(payments: List<PaymentEntity>)

    @Query("UPDATE transactions SET status = 'voided', void_reason = :reason WHERE id = :id")
    suspend fun voidTransaction(id: String, reason: String)

    @Query("UPDATE transactions SET sync_status = :status, sync_error = :error, sync_retry_count = sync_retry_count + 1 WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, error: String? = null)

    @Query("SELECT COUNT(*) FROM transactions WHERE sync_status = 'pending'")
    fun getPendingCount(): Flow<Int>

    @Query("""
        SELECT SUM(total_amount) FROM transactions 
        WHERE shift_id = :shiftId AND status = 'completed'
    """)
    suspend fun getShiftRevenue(shiftId: String): Long?

    @Query("""
        SELECT COUNT(*) FROM transactions 
        WHERE shift_id = :shiftId AND status = 'completed'
    """)
    suspend fun getShiftTransactionCount(shiftId: String): Int
}

// Transaction dengan items dan payments untuk tampilan detail
data class TransactionWithDetails(
    @Embedded val transaction: TransactionEntity,
    @Relation(parentColumn = "id", entityColumn = "transaction_id")
    val items: List<TransactionItemEntity>,
    @Relation(parentColumn = "id", entityColumn = "transaction_id")
    val payments: List<PaymentEntity>,
)

// ═══════════════════════════════════════════════════════════════════
// SYNC QUEUE DAO
// ═══════════════════════════════════════════════════════════════════
@Dao
interface SyncQueueDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun enqueue(item: SyncQueueEntity)

    @Query("""
        SELECT * FROM sync_queue 
        WHERE status = 'pending' 
          AND (next_retry_at IS NULL OR next_retry_at <= :now)
        ORDER BY created_at ASC 
        LIMIT :batchSize
    """)
    suspend fun getPendingBatch(now: Long = System.currentTimeMillis(), batchSize: Int = 50): List<SyncQueueEntity>

    @Query("UPDATE sync_queue SET status = 'in_progress' WHERE uuid IN (:uuids)")
    suspend fun markInProgress(uuids: List<String>)

    @Query("UPDATE sync_queue SET status = 'synced' WHERE uuid = :uuid")
    suspend fun markSynced(uuid: String)

    @Query("""
        UPDATE sync_queue 
        SET status = CASE WHEN retry_count >= max_retries THEN 'failed' ELSE 'pending' END,
            retry_count = retry_count + 1,
            error_message = :error,
            next_retry_at = :nextRetry
        WHERE uuid = :uuid
    """)
    suspend fun markFailed(uuid: String, error: String, nextRetry: Long)

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'")
    fun getPendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'failed'")
    fun getFailedCount(): Flow<Int>

    @Query("DELETE FROM sync_queue WHERE status = 'synced' AND created_at < :cutoff")
    suspend fun cleanSynced(cutoff: Long)
}
