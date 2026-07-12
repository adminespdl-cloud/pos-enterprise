package com.pos.enterprise.features.cashier.presentation

import com.pos.enterprise.core.data.local.entity.*
import com.pos.enterprise.core.data.local.dao.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.*
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.mockito.kotlin.*
import java.math.BigDecimal
import java.util.UUID

/**
 * Unit test untuk CashierViewModel.
 * Menggunakan TestCoroutineDispatcher agar coroutine berjalan sinkron.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CashierViewModelTest {

    private lateinit var viewModel: CashierViewModel
    private val testDispatcher = UnconfinedTestDispatcher()

    // ── Mock DAOs ───────────────────────────────────────────────────
    private val productDao:     ProductDao      = mock()
    private val transactionDao: TransactionDao  = mock()
    private val syncQueueDao:   SyncQueueDao    = mock()
    private val memberDao:      MemberDao       = mock()
    private val inventoryDao:   InventoryStockDao = mock()

    @Before
    fun setup() {
        viewModel = CashierViewModel(
            productDao     = productDao,
            transactionDao = transactionDao,
            syncQueueDao   = syncQueueDao,
            memberDao      = memberDao,
            inventoryDao   = inventoryDao,
            ioDispatcher   = testDispatcher,
        )
    }

    // ── Cart Operations ─────────────────────────────────────────────

    @Test
    fun `addToCart menambah item baru ke keranjang`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("25000"))

        viewModel.addToCart(product)

        val state = viewModel.uiState.first()
        assertEquals(1, state.cartItems.size)
        assertEquals(product.id, state.cartItems[0].productId)
        assertEquals(1, state.cartItems[0].qty)
    }

    @Test
    fun `addToCart meningkatkan qty jika produk sudah ada`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("25000"))

        viewModel.addToCart(product)
        viewModel.addToCart(product)
        viewModel.addToCart(product)

        val state = viewModel.uiState.first()
        assertEquals(1, state.cartItems.size)
        assertEquals(3, state.cartItems[0].qty)
    }

    @Test
    fun `removeFromCart mengurangi qty item`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("25000"))

        viewModel.addToCart(product)
        viewModel.addToCart(product) // qty = 2
        viewModel.removeFromCart(product.id)   // qty = 1

        val state = viewModel.uiState.first()
        assertEquals(1, state.cartItems[0].qty)
    }

    @Test
    fun `removeFromCart menghapus item jika qty menjadi 0`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("25000"))

        viewModel.addToCart(product) // qty = 1
        viewModel.removeFromCart(product.id)   // qty = 0 → hapus

        val state = viewModel.uiState.first()
        assertTrue(state.cartItems.isEmpty())
    }

    @Test
    fun `clearCart mengosongkan semua item`() = runTest(testDispatcher) {
        val p1 = buildProduct("p1", BigDecimal("25000"))
        val p2 = buildProduct("p2", BigDecimal("15000"))

        viewModel.addToCart(p1)
        viewModel.addToCart(p2)
        viewModel.clearCart()

        val state = viewModel.uiState.first()
        assertTrue(state.cartItems.isEmpty())
        assertEquals(BigDecimal.ZERO, state.subtotal)
    }

    // ── Total Calculation ───────────────────────────────────────────

    @Test
    fun `subtotal dihitung dengan benar untuk multiple items`() = runTest(testDispatcher) {
        val p1 = buildProduct("p1", BigDecimal("25000"))
        val p2 = buildProduct("p2", BigDecimal("15000"))

        viewModel.addToCart(p1) // 25.000
        viewModel.addToCart(p1) // 25.000 x2 = 50.000
        viewModel.addToCart(p2) // 15.000

        val state = viewModel.uiState.first()
        assertEquals(BigDecimal("65000"), state.subtotal)
    }

    @Test
    fun `total berkurang saat diskon diterapkan`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("100000"))
        viewModel.addToCart(product)

        viewModel.applyDiscount(BigDecimal("10000"))

        val state = viewModel.uiState.first()
        assertEquals(BigDecimal("10000"), state.discountAmount)
        assertEquals(BigDecimal("90000"), state.totalAmount)
    }

    @Test
    fun `poin tidak boleh melebihi total transaksi`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("50000"))
        viewModel.addToCart(product)

        // Coba redeem 200 poin = 200.000, tapi total hanya 50.000
        viewModel.setPointsRedeemed(200)

        val state = viewModel.uiState.first()
        // Redeem hanya sampai maksimum total
        assertTrue(state.pointsRedeemedAmount <= BigDecimal("50000"))
    }

    // ── Tax Calculation ─────────────────────────────────────────────

    @Test
    fun `pajak 11 persen dihitung dengan benar`() = runTest(testDispatcher) {
        val product = buildProduct(price = BigDecimal("100000"))
        viewModel.addToCart(product)
        viewModel.setTaxRate(BigDecimal("0.11"))

        val state = viewModel.uiState.first()
        assertEquals(BigDecimal("11000.00"), state.taxAmount.setScale(2))
        assertEquals(BigDecimal("111000.00"), state.totalAmount.setScale(2))
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private fun buildProduct(
        id: String = UUID.randomUUID().toString(),
        price: BigDecimal = BigDecimal("10000"),
    ) = ProductEntity(
        id           = id,
        name         = "Produk Test $id",
        categoryId   = null,
        sku          = null,
        barcode      = null,
        basePrice    = price,
        costPrice    = BigDecimal.ZERO,
        unit         = "pcs",
        isTrackStock = false,
        hasVariants  = false,
        status       = "active",
        imageUrl     = null,
        updatedAt    = System.currentTimeMillis(),
        isSynced     = true,
    )
}
