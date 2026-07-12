package com.pos.enterprise.features.cashier.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pos.enterprise.core.data.local.dao.*
import com.pos.enterprise.core.data.local.entity.*
import com.pos.enterprise.core.data.sync.SyncWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject
import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext

// ═══════════════════════════════════════════════════════════════════
// DOMAIN MODELS (UI State)
// ═══════════════════════════════════════════════════════════════════

data class CartItem(
    val productId: String,
    val variantId: String?,
    val productName: String,
    val variantName: String?,
    val unitPrice: Long,       // dalam sen (Rp × 100)
    val qty: Double,
    val discount: Long = 0L,
    val taxRate: Double = 0.0,
) {
    val subtotal: Long get() = ((unitPrice * qty) - discount).toLong()
    val taxAmount: Long get() = (subtotal * taxRate).toLong()
    val total: Long get() = subtotal + taxAmount
}

data class SelectedMember(
    val id: String,
    val name: String,
    val phone: String?,
    val tier: String,
    val pointsBalance: Long,
)

data class VoucherInfo(
    val code: String,
    val discountAmount: Long,
    val type: String,     // nominal|percent
    val value: Double,
)

sealed class ScanResult {
    data class Found(val product: ProductWithStock, val variants: List<ProductVariantEntity>) : ScanResult()
    object NotFound : ScanResult()
}

// ═══════════════════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════════════════

data class CashierUiState(
    val isLoading: Boolean               = false,
    val activeShift: ShiftEntity?        = null,
    val cart: List<CartItem>             = emptyList(),
    val selectedMember: SelectedMember?  = null,
    val voucher: VoucherInfo?            = null,
    val pointsToRedeem: Int              = 0,
    val searchQuery: String              = "",
    val selectedCategoryId: String?      = null,
    val products: List<ProductWithStock> = emptyList(),
    val categories: List<CategoryEntity> = emptyList(),
    val pendingSyncCount: Int            = 0,
    val scanResult: ScanResult?          = null,
    val error: String?                   = null,
) {
    // Kalkulasi real-time
    val subtotal: Long get() = cart.sumOf { it.subtotal }
    val totalDiscount: Long get() = cart.sumOf { it.discount } + (voucher?.discountAmount ?: 0L)
    val totalTax: Long get() = cart.sumOf { it.taxAmount }
    val pointsDiscount: Long get() = pointsToRedeem.toLong() // 1 poin = Rp1
    val total: Long get() = maxOf(0L, subtotal + totalTax - (voucher?.discountAmount ?: 0L) - pointsDiscount)
    val itemCount: Int get() = cart.sumOf { it.qty.toInt() }
    val pointsWillEarn: Int get() = (total / 1000).toInt()  // 1 poin per Rp1.000
    val isEmpty: Boolean get() = cart.isEmpty()
}

sealed class CashierEvent {
    data class ShowError(val message: String) : CashierEvent()
    data class TransactionCreated(val transactionId: String, val number: String) : CashierEvent()
    object CartCleared : CashierEvent()
    object ShiftNotOpen : CashierEvent()
}

// ═══════════════════════════════════════════════════════════════════
// VIEWMODEL
// ═══════════════════════════════════════════════════════════════════

@HiltViewModel
class CashierViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val memberDao: MemberDao,
    private val shiftDao: ShiftDao,
    private val transactionDao: TransactionDao,
    private val syncQueueDao: SyncQueueDao,
    private val inventoryStockDao: InventoryStockDao,
    private val json: Json,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CashierUiState())
    val uiState: StateFlow<CashierUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<CashierEvent>()
    val events: SharedFlow<CashierEvent> = _events.asSharedFlow()

    init {
        observeActiveShift()
        observeCategories()
        observePendingSync()
        loadProducts()
    }

    // ── Shift ──────────────────────────────────────────────────────
    private fun observeActiveShift() = viewModelScope.launch {
        shiftDao.getActiveShift().collect { shift ->
            _uiState.update { it.copy(activeShift = shift) }
        }
    }

    // ── Categories ─────────────────────────────────────────────────
    private fun observeCategories() = viewModelScope.launch {
        categoryDao.getAllCategories().collect { cats ->
            _uiState.update { it.copy(categories = cats) }
        }
    }

    // ── Pending Sync count ──────────────────────────────────────────
    private fun observePendingSync() = viewModelScope.launch {
        syncQueueDao.getPendingCount().collect { count ->
            _uiState.update { it.copy(pendingSyncCount = count) }
        }
    }

    // ── Products ───────────────────────────────────────────────────
    fun loadProducts(categoryId: String? = null, search: String? = null) {
        viewModelScope.launch {
            productDao.getProducts(
                categoryId = categoryId,
                search     = search?.ifBlank { null },
                limit      = 100,
            ).collect { products ->
                _uiState.update { it.copy(products = products) }
            }
        }
    }

    fun onSearchChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        loadProducts(
            categoryId = _uiState.value.selectedCategoryId,
            search     = query,
        )
    }

    fun onCategorySelect(categoryId: String?) {
        _uiState.update { it.copy(selectedCategoryId = categoryId) }
        loadProducts(categoryId = categoryId, search = _uiState.value.searchQuery)
    }

    // ── Cart CRUD ──────────────────────────────────────────────────
    fun addToCart(
        productId: String,
        variantId: String?,
        productName: String,
        variantName: String?,
        unitPrice: Long,
        taxRate: Double = 0.0,
    ) {
        val current = _uiState.value.cart.toMutableList()
        val existing = current.indexOfFirst {
            it.productId == productId && it.variantId == variantId
        }

        if (existing >= 0) {
            current[existing] = current[existing].copy(
                qty = current[existing].qty + 1
            )
        } else {
            current.add(CartItem(
                productId   = productId,
                variantId   = variantId,
                productName = productName,
                variantName = variantName,
                unitPrice   = unitPrice,
                qty         = 1.0,
                taxRate     = taxRate,
            ))
        }
        _uiState.update { it.copy(cart = current, error = null) }
    }

    fun updateQty(productId: String, variantId: String?, delta: Double) {
        val current = _uiState.value.cart.toMutableList()
        val idx = current.indexOfFirst { it.productId == productId && it.variantId == variantId }
        if (idx < 0) return

        val newQty = current[idx].qty + delta
        if (newQty <= 0) {
            current.removeAt(idx)
        } else {
            current[idx] = current[idx].copy(qty = newQty)
        }
        _uiState.update { it.copy(cart = current) }
    }

    fun removeFromCart(productId: String, variantId: String?) {
        _uiState.update { state ->
            state.copy(cart = state.cart.filter {
                !(it.productId == productId && it.variantId == variantId)
            })
        }
    }

    fun clearCart() {
        _uiState.update {
            CashierUiState(
                activeShift      = it.activeShift,
                categories       = it.categories,
                products         = it.products,
                pendingSyncCount = it.pendingSyncCount,
            )
        }
        viewModelScope.launch { _events.emit(CashierEvent.CartCleared) }
    }

    // ── Member ─────────────────────────────────────────────────────
    fun searchMember(phone: String) = viewModelScope.launch {
        val members = memberDao.searchByPhone(phone)
        if (members.isNotEmpty()) {
            val m = members.first()
            _uiState.update { it.copy(
                selectedMember = SelectedMember(
                    id            = m.id,
                    name          = m.name,
                    phone         = m.phone,
                    tier          = m.tier,
                    pointsBalance = m.pointsBalance,
                )
            )}
        }
    }

    fun selectMember(member: SelectedMember) {
        _uiState.update { it.copy(selectedMember = member) }
    }

    fun removeMember() {
        _uiState.update { it.copy(selectedMember = null, pointsToRedeem = 0) }
    }

    fun setPointsToRedeem(points: Int) {
        val member = _uiState.value.selectedMember ?: return
        val maxPoints = minOf(
            member.pointsBalance.toInt(),
            _uiState.value.total.toInt(),
        )
        _uiState.update { it.copy(pointsToRedeem = points.coerceIn(0, maxPoints)) }
    }

    fun applyVoucher(code: String) {
        viewModelScope.launch {
            // TODO: validasi voucher ke API atau dari cache lokal
            // Sementara simulasi
            if (code == "DEMO10") {
                _uiState.update { state ->
                    val discount = (state.subtotal * 0.10).toLong()
                    state.copy(voucher = VoucherInfo(
                        code           = code,
                        discountAmount = discount,
                        type           = "percent",
                        value          = 10.0,
                    ))
                }
            } else {
                _events.emit(CashierEvent.ShowError("Voucher tidak valid"))
            }
        }
    }

    fun removeVoucher() {
        _uiState.update { it.copy(voucher = null) }
    }

    // ── Barcode Scan ───────────────────────────────────────────────
    fun onBarcodeScanned(barcode: String) = viewModelScope.launch {
        val product = productDao.getByBarcode(barcode)
        if (product != null) {
            val variants = productDao.getProductWithVariants(product.id)?.variants ?: emptyList()
            _uiState.update { it.copy(
                scanResult = ScanResult.Found(
                    ProductWithStock(product, 0.0, 0.0), variants
                )
            )}
        } else {
            _uiState.update { it.copy(scanResult = ScanResult.NotFound) }
        }
    }

    fun clearScanResult() = _uiState.update { it.copy(scanResult = null) }

    // ── Process Transaction ────────────────────────────────────────
    fun processTransaction(
        outletId: String,
        cashierId: String,
        cashierName: String,
        deviceId: String,
        payments: List<PaymentEntity>,
    ) = viewModelScope.launch {
        val state = _uiState.value

        if (state.isEmpty) {
            _events.emit(CashierEvent.ShowError("Keranjang kosong"))
            return@launch
        }

        val shift = state.activeShift
        if (shift == null) {
            _events.emit(CashierEvent.ShiftNotOpen)
            return@launch
        }

        _uiState.update { it.copy(isLoading = true) }

        try {
            val now   = System.currentTimeMillis()
            val trxId = UUID.randomUUID().toString()
            val trxNo = generateTransactionNumber(outletId, now)

            // Buat transaksi lokal
            val transaction = TransactionEntity(
                id                 = trxId,
                outletId           = outletId,
                shiftId            = shift.id,
                cashierId          = cashierId,
                cashierName        = cashierName,
                memberId           = state.selectedMember?.id,
                memberName         = state.selectedMember?.name,
                transactionNumber  = trxNo,
                status             = "completed",
                subtotal           = state.subtotal,
                discountAmount     = state.totalDiscount,
                taxAmount          = state.totalTax,
                totalAmount        = state.total,
                pointsEarned       = state.pointsWillEarn,
                pointsRedeemed     = state.pointsToRedeem,
                deviceId           = deviceId,
                createdAt          = now,
                syncStatus         = "pending",
            )

            val items = state.cart.map { item ->
                TransactionItemEntity(
                    id            = UUID.randomUUID().toString(),
                    transactionId = trxId,
                    productId     = item.productId,
                    variantId     = item.variantId,
                    productName   = item.productName,
                    variantName   = item.variantName,
                    unitPrice     = item.unitPrice,
                    qty           = item.qty,
                    discount      = item.discount,
                    taxAmount     = item.taxAmount,
                    subtotal      = item.subtotal,
                )
            }

            // Simpan ke Room database
            transactionDao.insertTransaction(transaction)
            transactionDao.insertItems(items)
            transactionDao.insertPayments(payments)

            // Kurangi stok lokal
            for (item in state.cart) {
                inventoryStockDao.decrementStock(
                    productId = item.productId,
                    variantId = item.variantId ?: "null",
                    qty       = item.qty,
                )
            }

            // Update poin member lokal
            state.selectedMember?.let { member ->
                val newBalance = member.pointsBalance +
                        state.pointsWillEarn - state.pointsToRedeem
                memberDao.updatePoints(member.id, maxOf(0, newBalance))
            }

            // Tambah ke sync queue
            val syncPayload = buildSyncPayload(
                transaction = transaction,
                items       = items,
                payments    = payments,
            )
            syncQueueDao.enqueue(SyncQueueEntity(
                uuid            = trxId,
                entityType      = "transaction",
                payload         = json.encodeToString(syncPayload),
                clientCreatedAt = now,
            ))

            // Trigger sync jika ada koneksi
            SyncWorker.triggerImmediateSync(context)

            // Clear cart
            clearCart()

            _events.emit(CashierEvent.TransactionCreated(trxId, trxNo))

        } catch (e: Exception) {
            _events.emit(CashierEvent.ShowError("Gagal menyimpan transaksi: ${e.message}"))
        } finally {
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    // ── Private Helpers ────────────────────────────────────────────
    private fun generateTransactionNumber(outletId: String, timestamp: Long): String {
        val date    = java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.getDefault())
                        .format(java.util.Date(timestamp))
        val counter = (System.currentTimeMillis() % 10000).toString().padStart(4, '0')
        val prefix  = outletId.take(4).uppercase()
        return "TRX-$prefix-$date-$counter"
    }

    private fun buildSyncPayload(
        transaction: TransactionEntity,
        items: List<TransactionItemEntity>,
        payments: List<PaymentEntity>,
    ): Map<String, Any?> = mapOf(
        "transaction_number" to transaction.transactionNumber,
        "outlet_id"          to transaction.outletId,
        "shift_id"           to transaction.shiftId,
        "member_id"          to transaction.memberId,
        "status"             to transaction.status,
        "subtotal"           to transaction.subtotal,
        "discount_amount"    to transaction.discountAmount,
        "tax_amount"         to transaction.taxAmount,
        "total_amount"       to transaction.totalAmount,
        "points_earned"      to transaction.pointsEarned,
        "points_redeemed"    to transaction.pointsRedeemed,
        "device_id"          to transaction.deviceId,
        "items" to items.map { item ->
            mapOf(
                "product_id"   to item.productId,
                "variant_id"   to item.variantId,
                "product_name" to item.productName,
                "variant_name" to item.variantName,
                "unit_price"   to item.unitPrice,
                "qty"          to item.qty,
                "discount"     to item.discount,
                "tax_amount"   to item.taxAmount,
                "subtotal"     to item.subtotal,
            )
        },
        "payments" to payments.map { p ->
            mapOf(
                "method"           to p.method,
                "amount"           to p.amount,
                "reference_number" to p.referenceNumber,
            )
        },
    )
}
