package com.pos.enterprise.features.cashier.presentation

import android.content.res.Configuration
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pos.enterprise.core.data.local.dao.ProductWithStock
import com.pos.enterprise.core.data.local.entity.CategoryEntity
import com.pos.enterprise.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

// ═══════════════════════════════════════════════════════════════════
// FORMAT HELPER
// ═══════════════════════════════════════════════════════════════════

fun Long.toRupiah(): String {
    val formatted = NumberFormat.getNumberInstance(Locale("id", "ID")).format(this / 100)
    return "Rp $formatted"
}

// ═══════════════════════════════════════════════════════════════════
// CASHIER SCREEN — Layout Tablet Landscape (split panel)
// ═══════════════════════════════════════════════════════════════════

@Composable
fun CashierScreen(
    onNavigateToPayment: (total: Long) -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToShift: () -> Unit,
    viewModel: CashierViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    // Collect one-time events
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is CashierEvent.TransactionCreated -> {
                    onNavigateToPayment(uiState.total)
                }
                is CashierEvent.ShiftNotOpen -> {
                    onNavigateToShift()
                }
                else -> {}
            }
        }
    }

    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    Surface(
        modifier = Modifier.fillMaxSize(),
        color    = BgElevated,
    ) {
        if (isLandscape) {
            Row(Modifier.fillMaxSize()) {
                // ── LEFT: Produk catalog ─────────────────────────────────
                ProductCatalogPanel(
                    modifier        = Modifier.weight(0.58f),
                    uiState         = uiState,
                    onSearchChange  = viewModel::onSearchChange,
                    onCategorySelect = viewModel::onCategorySelect,
                    onProductClick  = { product ->
                        viewModel.addToCart(
                            productId   = product.product.id,
                            variantId   = null,
                            productName = product.product.name,
                            variantName = null,
                            unitPrice   = product.product.basePrice,
                        )
                    },
                    onBarcodeScanned = viewModel::onBarcodeScanned,
                    onHistoryClick  = onNavigateToHistory,
                    onShiftClick    = onNavigateToShift,
                )

                // Divider vertikal
                VerticalDivider(
                    thickness = 1.dp,
                    color     = BorderSubtle,
                )

                // ── RIGHT: Cart / Keranjang ──────────────────────────────
                CartPanel(
                    modifier        = Modifier.weight(0.42f),
                    uiState         = uiState,
                    onQtyChange     = viewModel::updateQty,
                    onRemoveItem    = viewModel::removeFromCart,
                    onMemberSearch  = viewModel::searchMember,
                    onMemberRemove  = viewModel::removeMember,
                    onVoucherApply  = viewModel::applyVoucher,
                    onVoucherRemove = viewModel::removeVoucher,
                    onPointsChange  = viewModel::setPointsToRedeem,
                    onCheckout      = { if (!uiState.isEmpty) onNavigateToPayment(uiState.total) },
                    onClearCart     = viewModel::clearCart,
                )
            }
        } else {
            // ── PORTRAIT: Full-screen tab-based layout ──────────
            var selectedTab by remember { mutableStateOf(0) }

            Column(Modifier.fillMaxSize()) {
                // Tab Row
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor   = BgSurface,
                    contentColor     = Primary600,
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick  = { selectedTab = 0 },
                        selectedContentColor   = Primary600,
                        unselectedContentColor = TextTertiary,
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(Icons.Outlined.Inventory2, null, modifier = Modifier.size(20.dp))
                            Text(
                                "Produk",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal,
                            )
                        }
                    }
                    Tab(
                        selected = selectedTab == 1,
                        onClick  = { selectedTab = 1 },
                        selectedContentColor   = Primary600,
                        unselectedContentColor = TextTertiary,
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(Icons.Outlined.ShoppingCart, null, modifier = Modifier.size(20.dp))
                            Text(
                                "Keranjang",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal,
                            )
                            if (uiState.itemCount > 0) {
                                Badge(containerColor = Secondary500) {
                                    Text(
                                        "${uiState.itemCount}",
                                        color = Color.White,
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                        }
                    }
                }

                // Tab Content — full screen
                when (selectedTab) {
                    0 -> ProductCatalogPanel(
                        modifier         = Modifier.weight(1f),
                        uiState          = uiState,
                        onSearchChange   = viewModel::onSearchChange,
                        onCategorySelect = viewModel::onCategorySelect,
                        onProductClick   = { product ->
                            viewModel.addToCart(
                                productId   = product.product.id,
                                variantId   = null,
                                productName = product.product.name,
                                variantName = null,
                                unitPrice   = product.product.basePrice,
                            )
                        },
                        onBarcodeScanned = viewModel::onBarcodeScanned,
                        onHistoryClick   = onNavigateToHistory,
                        onShiftClick     = onNavigateToShift,
                    )
                    1 -> CartPanel(
                        modifier        = Modifier.weight(1f),
                        uiState         = uiState,
                        onQtyChange     = viewModel::updateQty,
                        onRemoveItem    = viewModel::removeFromCart,
                        onMemberSearch  = viewModel::searchMember,
                        onMemberRemove  = viewModel::removeMember,
                        onVoucherApply  = viewModel::applyVoucher,
                        onVoucherRemove = viewModel::removeVoucher,
                        onPointsChange  = viewModel::setPointsToRedeem,
                        onCheckout      = { if (!uiState.isEmpty) onNavigateToPayment(uiState.total) },
                        onClearCart     = viewModel::clearCart,
                    )
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// LEFT PANEL — Katalog Produk
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun ProductCatalogPanel(
    modifier: Modifier,
    uiState: CashierUiState,
    onSearchChange: (String) -> Unit,
    onCategorySelect: (String?) -> Unit,
    onProductClick: (ProductWithStock) -> Unit,
    onBarcodeScanned: (String) -> Unit,
    onHistoryClick: () -> Unit,
    onShiftClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .background(BgElevated),
    ) {
        // ── Top Bar (handles status bar inset internally) ─────────
        TopBar(
            shift           = uiState.activeShift,
            pendingCount    = uiState.pendingSyncCount,
            onHistoryClick  = onHistoryClick,
            onShiftClick    = onShiftClick,
        )

        // ── Konten di bawah TopBar (dengan padding horizontal) ──
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
        ) {
            Spacer(Modifier.height(12.dp))

            // ── Search + Scan ───────────────────────────────────────
            Row(
                modifier    = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value         = uiState.searchQuery,
                    onValueChange = onSearchChange,
                    modifier      = Modifier.weight(1f),
                    placeholder   = { Text("Cari produk, barcode...", color = TextTertiary) },
                    leadingIcon   = { Icon(Icons.Outlined.Search, null, tint = TextSecondary) },
                    trailingIcon  = {
                        if (uiState.searchQuery.isNotEmpty()) {
                            IconButton(onClick = { onSearchChange("") }) {
                                Icon(Icons.Filled.Clear, null, tint = TextSecondary)
                            }
                        }
                    },
                    colors        = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor   = BgSurface,
                        unfocusedContainerColor = BgSurface,
                        focusedBorderColor      = Primary600,
                        unfocusedBorderColor    = BorderDefault,
                        focusedTextColor        = TextPrimary,
                        unfocusedTextColor      = TextPrimary,
                    ),
                    shape         = MaterialTheme.shapes.medium,
                    singleLine    = true,
                )

                // Tombol scan barcode
                OutlinedIconButton(
                    onClick = { /* Launch camera scanner */ },
                    border  = BorderStroke(1.dp, BorderDefault),
                    colors  = IconButtonDefaults.outlinedIconButtonColors(
                        containerColor = BgSurface,
                    ),
                    modifier = Modifier.size(56.dp),
                ) {
                    Icon(Icons.Outlined.QrCodeScanner, "Scan barcode", tint = Primary400)
                }
            }

            Spacer(Modifier.height(10.dp))

            // ── Category Chips ───────────────────────────────────
            CategoryChips(
                categories       = uiState.categories,
                selectedId       = uiState.selectedCategoryId,
                onCategorySelect = onCategorySelect,
            )

            Spacer(Modifier.height(12.dp))

            // ── Product Grid ──────────────────────────────────────
            if (uiState.products.isEmpty()) {
                EmptyProductsPlaceholder()
            } else {
                LazyVerticalGrid(
                    columns           = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding    = PaddingValues(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement   = Arrangement.spacedBy(10.dp),
                    modifier              = Modifier.fillMaxSize(),
                ) {
                    items(
                        items = uiState.products,
                        key   = { it.product.id },
                    ) { product ->
                        ProductCard(
                            product  = product,
                            onClick  = { onProductClick(product) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TopBar(
    shift: com.pos.enterprise.core.data.local.entity.ShiftEntity?,
    pendingCount: Int,
    onHistoryClick: () -> Unit,
    onShiftClick: () -> Unit,
) {
    // ── Blue App Bar — absorbs status bar area cleanly ──────────
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color    = Primary700,
        shadowElevation = 4.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()            // ← kunci: dorong konten di bawah status bar
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            // ── Kiri: Logo + Nama + Status Shift ─────────────────
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f),
            ) {
                // Logo bulat
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color.White.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "KP",
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 13.sp,
                    )
                }

                Spacer(Modifier.width(10.dp))

                Column {
                    Text(
                        text       = "Kasir Pintar",
                        style      = MaterialTheme.typography.titleMedium,
                        color      = Color.White,
                        fontWeight = FontWeight.Bold,
                        maxLines   = 1,
                        overflow   = TextOverflow.Ellipsis,
                    )
                    // Status shift — satu baris compact
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (shift != null) {
                            Box(
                                Modifier
                                    .size(6.dp)
                                    .background(Color(0xFF69F0AE), CircleShape)
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text  = "Shift aktif · ${shift.cashierName}",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.85f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        } else {
                            Icon(
                                Icons.Outlined.Warning,
                                null,
                                tint     = Color(0xFFFFD740),
                                modifier = Modifier.size(12.dp),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text  = "Buka shift dulu",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFFFD740),
                                maxLines = 1,
                            )
                        }
                    }
                }
            }

            // ── Kanan: Sync status + Icon buttons ────────────────
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                // Sync icon kecil — tidak pakai Chip agar tidak sempit
                IconButton(onClick = {}) {
                    Icon(
                        if (pendingCount > 0) Icons.Outlined.CloudUpload
                        else Icons.Outlined.CloudDone,
                        contentDescription = if (pendingCount > 0) "$pendingCount pending sync" else "Tersinkron",
                        tint = if (pendingCount > 0) Color(0xFFFFD740) else Color(0xFF69F0AE),
                        modifier = Modifier.size(22.dp),
                    )
                }

                IconButton(onClick = onHistoryClick) {
                    Icon(
                        Icons.Outlined.History,
                        "Riwayat Transaksi",
                        tint = Color.White.copy(alpha = 0.9f),
                        modifier = Modifier.size(22.dp),
                    )
                }

                IconButton(onClick = onShiftClick) {
                    Icon(
                        Icons.Outlined.AccessTime,
                        "Manajemen Shift",
                        tint = Color.White.copy(alpha = 0.9f),
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryChips(
    categories: List<CategoryEntity>,
    selectedId: String?,
    onCategorySelect: (String?) -> Unit,
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding        = PaddingValues(horizontal = 2.dp),
    ) {
        item {
            FilterChip(
                selected = selectedId == null,
                onClick  = { onCategorySelect(null) },
                label    = { Text("Semua") },
                colors   = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Primary600,
                    selectedLabelColor     = Color.White,
                    containerColor         = BgSurface,
                    labelColor             = TextSecondary,
                ),
            )
        }
        items(categories) { cat ->
            FilterChip(
                selected = selectedId == cat.id,
                onClick  = { onCategorySelect(cat.id) },
                label    = { Text(cat.name) },
                colors   = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Primary600,
                    selectedLabelColor     = Color.White,
                    containerColor         = BgSurface,
                    labelColor             = TextSecondary,
                ),
            )
        }
    }
}

@Composable
private fun ProductCard(
    product: ProductWithStock,
    onClick: () -> Unit,
) {
    val isOutOfStock = product.stock <= 0 && product.product.isTrackStock

    Card(
        onClick   = { if (!isOutOfStock) onClick() },
        modifier  = Modifier.fillMaxWidth().aspectRatio(0.85f),
        colors    = CardDefaults.cardColors(
            containerColor = if (isOutOfStock) BgSurface.copy(alpha = 0.5f) else BgSurface,
        ),
        border    = BorderStroke(
            1.dp,
            if (isOutOfStock) BorderSubtle else BorderDefault,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Gambar / Icon placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .background(BgSurface2, MaterialTheme.shapes.small),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Outlined.ShoppingCart,
                    contentDescription = null,
                    tint     = if (isOutOfStock) TextDisabled else Primary400,
                    modifier = Modifier.size(36.dp),
                )
            }

            Spacer(Modifier.height(8.dp))

            Column {
                Text(
                    text     = product.product.name,
                    style    = MaterialTheme.typography.bodyMedium,
                    color    = if (isOutOfStock) TextDisabled else TextPrimary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )

                Spacer(Modifier.height(4.dp))

                Text(
                    text  = product.product.basePrice.toRupiah(),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (isOutOfStock) TextDisabled else Primary400,
                    fontWeight = FontWeight.Bold,
                )

                // Stok badge
                if (product.product.isTrackStock) {
                    Spacer(Modifier.height(4.dp))
                    val (bgColor, txtColor, label) = when {
                        isOutOfStock          -> Triple(Error500.copy(0.15f), Error500, "Habis")
                        product.stock <= product.min_stock -> Triple(Warning500.copy(0.15f), Warning500, "Stok: ${product.stock.toInt()}")
                        else                  -> Triple(Success500.copy(0.1f), Success500, "Stok: ${product.stock.toInt()}")
                    }
                    Surface(
                        shape = MaterialTheme.shapes.extraSmall,
                        color = bgColor,
                    ) {
                        Text(
                            text     = label,
                            style    = MaterialTheme.typography.labelSmall,
                            color    = txtColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyProductsPlaceholder() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Outlined.Inventory2, null, tint = TextDisabled, modifier = Modifier.size(64.dp))
            Spacer(Modifier.height(12.dp))
            Text("Tidak ada produk", style = MaterialTheme.typography.bodyLarge, color = TextDisabled)
            Text("Coba ubah filter pencarian", style = MaterialTheme.typography.bodySmall, color = TextTertiary)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// RIGHT PANEL — Keranjang & Checkout
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun CartPanel(
    modifier: Modifier,
    uiState: CashierUiState,
    onQtyChange: (String, String?, Double) -> Unit,
    onRemoveItem: (String, String?) -> Unit,
    onMemberSearch: (String) -> Unit,
    onMemberRemove: () -> Unit,
    onVoucherApply: (String) -> Unit,
    onVoucherRemove: () -> Unit,
    onPointsChange: (Int) -> Unit,
    onCheckout: () -> Unit,
    onClearCart: () -> Unit,
) {
    var memberQuery    by remember { mutableStateOf("") }
    var voucherCode    by remember { mutableStateOf("") }
    var showClearDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxHeight()
            .background(BgElevated)
            .padding(horizontal = 16.dp),
    ) {
        // ── Header ────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text       = "Keranjang",
                style      = MaterialTheme.typography.headlineSmall,
                color      = TextPrimary,
                fontWeight = FontWeight.Bold,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (uiState.itemCount > 0) {
                    Badge {
                        Text("${uiState.itemCount}", style = MaterialTheme.typography.labelSmall)
                    }
                    Spacer(Modifier.width(8.dp))
                }
                if (!uiState.isEmpty) {
                    IconButton(onClick = { showClearDialog = true }) {
                        Icon(Icons.Outlined.DeleteSweep, "Hapus semua", tint = Error500)
                    }
                }
            }
        }

        // ── Cart Items ────────────────────────────────────────────
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (uiState.isEmpty) {
                item {
                    EmptyCartPlaceholder()
                }
            } else {
                items(
                    items = uiState.cart,
                    key   = { "${it.productId}_${it.variantId}" },
                ) { item ->
                    CartItemRow(
                        item      = item,
                        onIncrease = { onQtyChange(item.productId, item.variantId, +1.0) },
                        onDecrease = { onQtyChange(item.productId, item.variantId, -1.0) },
                        onRemove   = { onRemoveItem(item.productId, item.variantId) },
                    )
                }

                // ── Member ─────────────────────────────────────────
                item {
                    Spacer(Modifier.height(4.dp))
                    HorizontalDivider(color = BorderSubtle)
                    Spacer(Modifier.height(8.dp))
                    MemberSection(
                        member         = uiState.selectedMember,
                        query          = memberQuery,
                        onQueryChange  = { memberQuery = it },
                        onSearch       = { onMemberSearch(memberQuery) },
                        onRemove       = onMemberRemove,
                        pointsToRedeem = uiState.pointsToRedeem,
                        onPointsChange = onPointsChange,
                    )
                }

                // ── Voucher ────────────────────────────────────────
                item {
                    Spacer(Modifier.height(8.dp))
                    VoucherSection(
                        voucher       = uiState.voucher,
                        code          = voucherCode,
                        onCodeChange  = { voucherCode = it },
                        onApply       = { onVoucherApply(voucherCode) },
                        onRemove      = { onVoucherRemove(); voucherCode = "" },
                    )
                }
            }
        }

        // ── Summary + Checkout ────────────────────────────────────
        if (!uiState.isEmpty) {
            HorizontalDivider(color = BorderSubtle, modifier = Modifier.padding(vertical = 8.dp))
            TransactionSummary(uiState = uiState)
            Spacer(Modifier.height(12.dp))
            CheckoutButton(
                total     = uiState.total,
                enabled   = !uiState.isEmpty && !uiState.isLoading,
                isLoading = uiState.isLoading,
                onClick   = onCheckout,
            )
        }

        Spacer(Modifier.height(16.dp))
    }

    // Clear cart dialog
    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = { Text("Hapus Semua Item?") },
            text  = { Text("Semua item di keranjang akan dihapus.", color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = { onClearCart(); showClearDialog = false }) {
                    Text("Hapus", color = Error500)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text("Batal")
                }
            },
            containerColor = BgSurface3,
        )
    }
}

@Composable
private fun CartItemRow(
    item: CartItem,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        colors    = CardDefaults.cardColors(containerColor = BgSurface),
        border    = BorderStroke(1.dp, BorderSubtle),
        elevation = CardDefaults.cardElevation(0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text  = item.productName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (item.variantName != null) {
                    Text(
                        text  = item.variantName,
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                }
                Text(
                    text  = item.unitPrice.toRupiah(),
                    style = MaterialTheme.typography.labelMedium,
                    color = Primary400,
                )
            }

            // Qty controls
            Row(verticalAlignment = Alignment.CenterVertically) {
                SmallIconButton(Icons.Filled.Remove, "Kurang", onClick = onDecrease)
                Text(
                    text      = if (item.qty == item.qty.toLong().toDouble())
                                    item.qty.toInt().toString()
                                else item.qty.toString(),
                    style     = MaterialTheme.typography.titleMedium,
                    color     = TextPrimary,
                    modifier  = Modifier.widthIn(min = 32.dp),
                    textAlign = TextAlign.Center,
                )
                SmallIconButton(Icons.Filled.Add, "Tambah", onClick = onIncrease)
            }

            Spacer(Modifier.width(8.dp))

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text  = item.subtotal.toRupiah(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.SemiBold,
                )
                IconButton(onClick = onRemove, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Outlined.Close, "Hapus", tint = TextTertiary, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
private fun SmallIconButton(icon: ImageVector, description: String, onClick: () -> Unit) {
    FilledTonalIconButton(
        onClick  = onClick,
        modifier = Modifier.size(32.dp),
        colors   = IconButtonDefaults.filledTonalIconButtonColors(
            containerColor = BgSurface2,
        ),
    ) {
        Icon(icon, description, modifier = Modifier.size(16.dp), tint = TextPrimary)
    }
}

@Composable
private fun MemberSection(
    member: SelectedMember?,
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onRemove: () -> Unit,
    pointsToRedeem: Int,
    onPointsChange: (Int) -> Unit,
) {
    Column {
        Text("Member", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        Spacer(Modifier.height(6.dp))

        if (member != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Primary900.copy(alpha = 0.3f)),
                border = BorderStroke(1.dp, Primary700),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(member.name, style = MaterialTheme.typography.bodyMedium,
                            color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text(
                            text  = "${member.phone ?: ""} · ${member.tier.replaceFirstChar { it.uppercase() }}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary,
                        )
                        Text(
                            text  = "Poin: ${member.pointsBalance}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Primary400,
                        )
                    }
                    IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Outlined.PersonOff, "Hapus member", tint = TextTertiary, modifier = Modifier.size(18.dp))
                    }
                }

                // Slider redeem poin
                if (member.pointsBalance > 0) {
                    Column(modifier = Modifier.padding(horizontal = 10.dp).padding(bottom = 10.dp)) {
                        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                            Text("Pakai poin", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            Text(
                                text  = "$pointsToRedeem poin (${pointsToRedeem.toLong().toRupiah()})",
                                style = MaterialTheme.typography.labelSmall,
                                color = Primary400,
                            )
                        }
                        Slider(
                            value         = pointsToRedeem.toFloat(),
                            onValueChange = { onPointsChange(it.toInt()) },
                            valueRange    = 0f..member.pointsBalance.toFloat(),
                            steps         = 0,
                            colors        = SliderDefaults.colors(thumbColor = Primary600, activeTrackColor = Primary600),
                        )
                    }
                }
            }
        } else {
            OutlinedTextField(
                value         = query,
                onValueChange = onQueryChange,
                modifier      = Modifier.fillMaxWidth(),
                placeholder   = { Text("Cari member (no. HP)", color = TextTertiary) },
                leadingIcon   = { Icon(Icons.Outlined.Person, null, tint = TextSecondary) },
                trailingIcon  = {
                    if (query.length >= 4) {
                        IconButton(onClick = onSearch) {
                            Icon(Icons.Filled.Search, null, tint = Primary400)
                        }
                    }
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                colors        = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor   = BgSurface,
                    unfocusedContainerColor = BgSurface,
                    focusedBorderColor      = Primary600,
                    unfocusedBorderColor    = BorderDefault,
                    focusedTextColor        = TextPrimary,
                    unfocusedTextColor      = TextPrimary,
                ),
                shape    = MaterialTheme.shapes.medium,
                singleLine = true,
            )
        }
    }
}

@Composable
private fun VoucherSection(
    voucher: VoucherInfo?,
    code: String,
    onCodeChange: (String) -> Unit,
    onApply: () -> Unit,
    onRemove: () -> Unit,
) {
    Column {
        Text("Voucher", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        Spacer(Modifier.height(6.dp))

        if (voucher != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Success700.copy(alpha = 0.15f)),
                border = BorderStroke(1.dp, Success700),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Discount, null, tint = Success500, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Column(Modifier.weight(1f)) {
                        Text(voucher.code, style = MaterialTheme.typography.bodySmall,
                            color = TextPrimary, fontWeight = FontWeight.SemiBold)
                        Text(
                            text  = "Diskon ${voucher.discountAmount.toRupiah()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Success500,
                        )
                    }
                    IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Outlined.Close, "Hapus voucher", tint = TextTertiary, modifier = Modifier.size(16.dp))
                    }
                }
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value         = code,
                    onValueChange = { onCodeChange(it.uppercase()) },
                    modifier      = Modifier.weight(1f),
                    placeholder   = { Text("Kode voucher", color = TextTertiary) },
                    leadingIcon   = { Icon(Icons.Outlined.ConfirmationNumber, null, tint = TextSecondary) },
                    colors        = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor   = BgSurface,
                        unfocusedContainerColor = BgSurface,
                        focusedBorderColor      = Primary600,
                        unfocusedBorderColor    = BorderDefault,
                        focusedTextColor        = TextPrimary,
                        unfocusedTextColor      = TextPrimary,
                    ),
                    shape      = MaterialTheme.shapes.medium,
                    singleLine = true,
                )
                FilledTonalButton(
                    onClick  = onApply,
                    enabled  = code.isNotBlank(),
                    modifier = Modifier.height(56.dp),
                ) {
                    Text("Pakai")
                }
            }
        }
    }
}

@Composable
private fun TransactionSummary(uiState: CashierUiState) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SummaryRow("Subtotal", uiState.subtotal.toRupiah())
        if (uiState.totalDiscount > 0)
            SummaryRow("Diskon", "-${uiState.totalDiscount.toRupiah()}", color = Success500)
        if (uiState.pointsToRedeem > 0)
            SummaryRow("Redeem Poin", "-${uiState.pointsDiscount.toRupiah()}", color = Success500)
        if (uiState.totalTax > 0)
            SummaryRow("Pajak", uiState.totalTax.toRupiah())

        HorizontalDivider(color = BorderDefault, modifier = Modifier.padding(vertical = 4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("TOTAL", style = MaterialTheme.typography.titleLarge,
                color = TextPrimary, fontWeight = FontWeight.Bold)
            Text(
                text  = uiState.total.toRupiah(),
                style = MaterialTheme.typography.headlineSmall,
                color = Primary400,
                fontWeight = FontWeight.ExtraBold,
            )
        }

        if (uiState.selectedMember != null && uiState.pointsWillEarn > 0) {
            Text(
                text  = "+ ${uiState.pointsWillEarn} poin akan diterima",
                style = MaterialTheme.typography.labelSmall,
                color = Primary400,
                modifier = Modifier.align(Alignment.End),
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, color: Color = TextSecondary) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        Text(value, style = MaterialTheme.typography.bodySmall, color = color, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun CheckoutButton(
    total: Long,
    enabled: Boolean,
    isLoading: Boolean,
    onClick: () -> Unit,
) {
    Button(
        onClick  = onClick,
        enabled  = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Primary600,
            disabledContainerColor = BgSurface2,
        ),
        shape = MaterialTheme.shapes.medium,
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color    = Color.White,
                strokeWidth = 2.dp,
            )
        } else {
            Icon(Icons.Filled.Payment, null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                text       = "Bayar ${total.toRupiah()}",
                style      = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color      = Color.White,
            )
        }
    }
}

@Composable
private fun EmptyCartPlaceholder() {
    Box(
        modifier = Modifier.fillMaxWidth().height(200.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Outlined.ShoppingCartCheckout, null,
                tint = TextDisabled, modifier = Modifier.size(56.dp))
            Spacer(Modifier.height(12.dp))
            Text("Keranjang kosong", style = MaterialTheme.typography.bodyLarge, color = TextDisabled)
            Text("Tap produk untuk menambahkan", style = MaterialTheme.typography.bodySmall, color = TextTertiary)
        }
    }
}
