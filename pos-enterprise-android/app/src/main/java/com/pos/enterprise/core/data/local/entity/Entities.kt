package com.pos.enterprise.core.data.local.entity

import androidx.room.*

// ═══════════════════════════════════════════════════════════════════
// PRODUCT
// ═══════════════════════════════════════════════════════════════════
@Entity(tableName = "products", indices = [
    Index("category_id"),
    Index("barcode"),
    Index("status"),
    Index("updated_at")
])
data class ProductEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "category_id") val categoryId: String?,
    val name: String,
    val description: String? = null,
    val barcode: String? = null,
    val sku: String? = null,
    @ColumnInfo(name = "base_price") val basePrice: Long,        // dalam sen (Rp × 100)
    @ColumnInfo(name = "cost_price") val costPrice: Long = 0,
    val unit: String = "pcs",
    @ColumnInfo(name = "image_url") val imageUrl: String? = null,
    @ColumnInfo(name = "is_track_stock") val isTrackStock: Boolean = true,
    @ColumnInfo(name = "has_variants") val hasVariants: Boolean = false,
    val status: String = "active",                               // active|inactive|deleted
    @ColumnInfo(name = "updated_at") val updatedAt: Long,        // epoch ms
    @ColumnInfo(name = "is_deleted") val isDeleted: Boolean = false,
)

// ═══════════════════════════════════════════════════════════════════
// PRODUCT VARIANT
// ═══════════════════════════════════════════════════════════════════
@Entity(
    tableName = "product_variants",
    foreignKeys = [ForeignKey(
        entity = ProductEntity::class,
        parentColumns = ["id"],
        childColumns = ["product_id"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("product_id")]
)
data class ProductVariantEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "product_id") val productId: String,
    val sku: String? = null,
    val attributes: String,           // JSON: {"Ukuran":"Large","Rasa":"Vanilla"}
    val price: Long,
    @ColumnInfo(name = "image_url") val imageUrl: String? = null,
    @ColumnInfo(name = "is_active") val isActive: Boolean = true,
)

// ═══════════════════════════════════════════════════════════════════
// CATEGORY
// ═══════════════════════════════════════════════════════════════════
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "parent_id") val parentId: String? = null,
    val name: String,
    @ColumnInfo(name = "sort_order") val sortOrder: Int = 0,
    @ColumnInfo(name = "is_active") val isActive: Boolean = true,
)

// ═══════════════════════════════════════════════════════════════════
// INVENTORY STOCK
// ═══════════════════════════════════════════════════════════════════
@Entity(
    tableName = "inventory_stocks",
    primaryKeys = ["product_id", "variant_id_or_null"],
    indices = [Index("product_id")]
)
data class InventoryStockEntity(
    @ColumnInfo(name = "product_id") val productId: String,
    @ColumnInfo(name = "variant_id_or_null") val variantId: String,  // "null" jika tanpa varian
    val quantity: Double,
    @ColumnInfo(name = "minimum_stock") val minimumStock: Double = 0.0,
)

// ═══════════════════════════════════════════════════════════════════
// MEMBER
// ═══════════════════════════════════════════════════════════════════
@Entity(tableName = "members", indices = [Index("phone")])
data class MemberEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String?,
    val email: String? = null,
    val tier: String = "bronze",
    @ColumnInfo(name = "points_balance") val pointsBalance: Long = 0,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

// ═══════════════════════════════════════════════════════════════════
// SHIFT
// ═══════════════════════════════════════════════════════════════════
@Entity(tableName = "shifts")
data class ShiftEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "outlet_id") val outletId: String,
    @ColumnInfo(name = "cashier_id") val cashierId: String,
    @ColumnInfo(name = "cashier_name") val cashierName: String,
    val status: String,              // open|closed
    @ColumnInfo(name = "opened_at") val openedAt: Long,
    @ColumnInfo(name = "closed_at") val closedAt: Long? = null,
    @ColumnInfo(name = "opening_cash") val openingCash: Long,
    @ColumnInfo(name = "closing_cash") val closingCash: Long? = null,
    @ColumnInfo(name = "expected_cash") val expectedCash: Long? = null,
    @ColumnInfo(name = "cash_difference") val cashDifference: Long? = null,
    val notes: String? = null,
    @ColumnInfo(name = "is_synced") val isSynced: Boolean = true,
)

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION (offline-first: dibuat lokal, di-sync ke server)
// ═══════════════════════════════════════════════════════════════════
@Entity(tableName = "transactions", indices = [
    Index("shift_id"),
    Index("sync_status"),
    Index("created_at")
])
data class TransactionEntity(
    @PrimaryKey val id: String,      // UUID v4 — dibuat di device
    @ColumnInfo(name = "outlet_id") val outletId: String,
    @ColumnInfo(name = "shift_id") val shiftId: String,
    @ColumnInfo(name = "cashier_id") val cashierId: String,
    @ColumnInfo(name = "cashier_name") val cashierName: String,
    @ColumnInfo(name = "member_id") val memberId: String? = null,
    @ColumnInfo(name = "member_name") val memberName: String? = null,
    @ColumnInfo(name = "transaction_number") val transactionNumber: String,
    val status: String = "completed",   // completed|voided
    val subtotal: Long,
    @ColumnInfo(name = "discount_amount") val discountAmount: Long = 0,
    @ColumnInfo(name = "tax_amount") val taxAmount: Long = 0,
    @ColumnInfo(name = "total_amount") val totalAmount: Long,
    @ColumnInfo(name = "points_earned") val pointsEarned: Int = 0,
    @ColumnInfo(name = "points_redeemed") val pointsRedeemed: Int = 0,
    @ColumnInfo(name = "void_reason") val voidReason: String? = null,
    @ColumnInfo(name = "device_id") val deviceId: String? = null,
    val notes: String? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long,   // epoch ms
    @ColumnInfo(name = "sync_status") val syncStatus: String = "pending", // pending|synced|failed
    @ColumnInfo(name = "sync_retry_count") val syncRetryCount: Int = 0,
    @ColumnInfo(name = "sync_error") val syncError: String? = null,
)

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION ITEM
// ═══════════════════════════════════════════════════════════════════
@Entity(
    tableName = "transaction_items",
    foreignKeys = [ForeignKey(
        entity = TransactionEntity::class,
        parentColumns = ["id"],
        childColumns = ["transaction_id"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("transaction_id")]
)
data class TransactionItemEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "transaction_id") val transactionId: String,
    @ColumnInfo(name = "product_id") val productId: String,
    @ColumnInfo(name = "variant_id") val variantId: String? = null,
    @ColumnInfo(name = "product_name") val productName: String,  // snapshot
    @ColumnInfo(name = "variant_name") val variantName: String? = null,
    @ColumnInfo(name = "unit_price") val unitPrice: Long,
    val qty: Double,
    val discount: Long = 0,
    @ColumnInfo(name = "tax_amount") val taxAmount: Long = 0,
    val subtotal: Long,
)

// ═══════════════════════════════════════════════════════════════════
// PAYMENT
// ═══════════════════════════════════════════════════════════════════
@Entity(
    tableName = "payments",
    foreignKeys = [ForeignKey(
        entity = TransactionEntity::class,
        parentColumns = ["id"],
        childColumns = ["transaction_id"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("transaction_id")]
)
data class PaymentEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "transaction_id") val transactionId: String,
    val method: String,              // cash|qris|transfer|voucher|points
    val amount: Long,
    @ColumnInfo(name = "reference_number") val referenceNumber: String? = null,
    @ColumnInfo(name = "voucher_code") val voucherCode: String? = null,
)

// ═══════════════════════════════════════════════════════════════════
// SYNC QUEUE (offline operations waiting to be pushed)
// ═══════════════════════════════════════════════════════════════════
@Entity(tableName = "sync_queue", indices = [
    Index("status"),
    Index("entity_type"),
    Index("created_at")
])
data class SyncQueueEntity(
    @PrimaryKey val uuid: String,          // UUID transaksi/member/dll.
    @ColumnInfo(name = "entity_type") val entityType: String,  // transaction|member|inventory_adjustment
    val payload: String,                    // JSON payload
    val status: String = "pending",         // pending|in_progress|synced|failed
    @ColumnInfo(name = "retry_count") val retryCount: Int = 0,
    @ColumnInfo(name = "max_retries") val maxRetries: Int = 5,
    @ColumnInfo(name = "next_retry_at") val nextRetryAt: Long? = null,
    @ColumnInfo(name = "error_message") val errorMessage: String? = null,
    @ColumnInfo(name = "client_created_at") val clientCreatedAt: Long,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
)
