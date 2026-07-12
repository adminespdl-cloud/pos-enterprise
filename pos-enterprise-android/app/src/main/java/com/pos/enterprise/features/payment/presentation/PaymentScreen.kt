package com.pos.enterprise.features.payment.presentation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos.enterprise.features.cashier.presentation.toRupiah
import com.pos.enterprise.ui.theme.*

// ═══════════════════════════════════════════════════════════════════
// PAYMENT STATE
// ═══════════════════════════════════════════════════════════════════

enum class PaymentMethod(
    val label: String,
    val icon: ImageVector,
    val bgColor: Color,
    val textColor: Color,
) {
    CASH(     "Tunai",    Icons.Outlined.Payments,          CashBg,     CashText),
    QRIS(     "QRIS",     Icons.Outlined.QrCode2,           QrisBg,     QrisText),
    TRANSFER( "Transfer", Icons.Outlined.AccountBalance,    TransferBg, TransferText),
    VOUCHER(  "Voucher",  Icons.Outlined.ConfirmationNumber, BgSurface3, TextSecondary),
    POINTS(   "Poin",     Icons.Outlined.Stars,             BgSurface3, TextSecondary),
}

data class PaymentEntry(
    val method: PaymentMethod,
    val amount: Long,
    val referenceNumber: String? = null,
)

// ═══════════════════════════════════════════════════════════════════
// PAYMENT SCREEN
// ═══════════════════════════════════════════════════════════════════

@Composable
fun PaymentScreen(
    totalAmount: Long,
    onPaymentConfirmed: (payments: List<PaymentEntry>, change: Long) -> Unit,
    onBack: () -> Unit,
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var cashInput      by remember { mutableStateOf("") }
    var payments       by remember { mutableStateOf<List<PaymentEntry>>(emptyList()) }
    var referenceNum   by remember { mutableStateOf("") }

    val totalPaid = payments.sumOf { it.amount }
    val remaining = totalAmount - totalPaid
    val change    = if (totalPaid >= totalAmount) totalPaid - totalAmount else 0L

    val isFullyPaid = totalPaid >= totalAmount
    val cashAmount  = cashInput.toLongOrNull()?.times(100L) ?: 0L

    Surface(modifier = Modifier.fillMaxSize(), color = BgElevated) {
        Row(Modifier.fillMaxSize()) {
            // ── LEFT: Numpad ─────────────────────────────────────────
            Column(
                modifier = Modifier
                    .weight(0.45f)
                    .fillMaxHeight()
                    .background(BgSurface)
                    .padding(24.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Kembali", tint = TextSecondary)
                    }

                    Spacer(Modifier.height(16.dp))

                    Text(
                        text       = "Total Tagihan",
                        style      = MaterialTheme.typography.bodyMedium,
                        color      = TextSecondary,
                    )
                    Text(
                        text       = totalAmount.toRupiah(),
                        style      = MaterialTheme.typography.displayLarge.copy(fontSize = 40.sp),
                        color      = TextPrimary,
                        fontWeight = FontWeight.ExtraBold,
                    )

                    if (totalPaid > 0) {
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            LabelValue("Dibayar", totalPaid.toRupiah(), Success500)
                            if (remaining > 0) LabelValue("Sisa", remaining.toRupiah(), Warning500)
                            if (change > 0) LabelValue("Kembalian", change.toRupiah(), Primary400)
                        }
                    }

                    Spacer(Modifier.height(24.dp))

                    // Input nominal
                    AnimatedContent(targetState = selectedMethod, label = "method_input") { method ->
                        Column {
                            Text(
                                text  = "Jumlah ${method.label}",
                                style = MaterialTheme.typography.labelLarge,
                                color = TextSecondary,
                            )
                            Spacer(Modifier.height(6.dp))

                            // Display input
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(BgSurface2, MaterialTheme.shapes.medium)
                                    .border(1.dp, if (cashInput.isNotEmpty()) Primary600 else BorderDefault, MaterialTheme.shapes.medium)
                                    .padding(16.dp),
                            ) {
                                Text(
                                    text  = if (cashInput.isEmpty()) "0"
                                            else (cashInput.toLongOrNull()?.times(100L) ?: 0L).toRupiah(),
                                    style = MaterialTheme.typography.headlineLarge,
                                    color = if (cashInput.isEmpty()) TextDisabled else TextPrimary,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.End,
                                )
                            }

                            // Tombol cepat
                            Spacer(Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                val quickAmounts = listOf(
                                    50_000L, 100_000L, 200_000L, 500_000L
                                ).filter { it * 100 <= remaining * 2 + 50_000 * 100 }

                                items(quickAmounts.size) { idx ->
                                    OutlinedButton(
                                        onClick = {
                                            cashInput = (quickAmounts[idx]).toString()
                                        },
                                        border  = BorderStroke(1.dp, BorderDefault),
                                        colors  = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary),
                                    ) {
                                        Text(
                                            "Rp ${NumberFormatHelper.format(quickAmounts[idx])}",
                                            style = MaterialTheme.typography.labelMedium,
                                        )
                                    }
                                }
                                // Pas tombol
                                item {
                                    OutlinedButton(
                                        onClick = { cashInput = (remaining / 100).toString() },
                                        border  = BorderStroke(1.dp, Primary700),
                                        colors  = ButtonDefaults.outlinedButtonColors(contentColor = Primary400),
                                    ) {
                                        Text("Pas", style = MaterialTheme.typography.labelMedium)
                                    }
                                }
                            }
                        }
                    }

                    // Reference number (untuk QRIS/Transfer)
                    if (selectedMethod == PaymentMethod.QRIS || selectedMethod == PaymentMethod.TRANSFER) {
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value         = referenceNum,
                            onValueChange = { referenceNum = it },
                            label         = { Text("No. Referensi (opsional)") },
                            modifier      = Modifier.fillMaxWidth(),
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
                    }
                }

                // Numpad
                NumPad(
                    onDigit  = { digit ->
                        if (cashInput.length < 12) cashInput += digit
                    },
                    onDelete  = {
                        if (cashInput.isNotEmpty()) cashInput = cashInput.dropLast(1)
                    },
                    onClear   = { cashInput = "" },
                )
            }

            // ── RIGHT: Metode & Konfirmasi ───────────────────────────
            Column(
                modifier = Modifier
                    .weight(0.55f)
                    .fillMaxHeight()
                    .padding(24.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        text       = "Metode Pembayaran",
                        style      = MaterialTheme.typography.headlineSmall,
                        color      = TextPrimary,
                        fontWeight = FontWeight.Bold,
                    )

                    Spacer(Modifier.height(16.dp))

                    // Payment method cards
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        PaymentMethod.values().forEach { method ->
                            PaymentMethodCard(
                                method     = method,
                                isSelected = selectedMethod == method,
                                onClick    = { selectedMethod = method; cashInput = "" },
                            )
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // Daftar pembayaran yang sudah ditambahkan
                    if (payments.isNotEmpty()) {
                        Text(
                            text  = "Pembayaran Ditambahkan",
                            style = MaterialTheme.typography.labelLarge,
                            color = TextSecondary,
                        )
                        Spacer(Modifier.height(8.dp))
                        payments.forEach { entry ->
                            PaymentEntryChip(entry = entry, onRemove = {
                                payments = payments.filter { it != entry }
                            })
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Tombol "Tambah Pembayaran" (untuk split payment)
                    if (!isFullyPaid && cashAmount > 0) {
                        OutlinedButton(
                            onClick = {
                                payments = payments + PaymentEntry(
                                    method          = selectedMethod,
                                    amount          = minOf(cashAmount, remaining),
                                    referenceNumber = referenceNum.ifBlank { null },
                                )
                                cashInput    = ""
                                referenceNum = ""
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            border   = BorderStroke(1.dp, Primary600),
                        ) {
                            Icon(Icons.Filled.AddCircleOutline, null, tint = Primary400)
                            Spacer(Modifier.width(8.dp))
                            Text("Tambah ${selectedMethod.label}", color = Primary400)
                        }
                    }

                    // Tombol Konfirmasi utama
                    val canConfirm = isFullyPaid || (cashAmount >= remaining && remaining > 0)
                    Button(
                        onClick = {
                            val finalPayments = if (isFullyPaid) payments
                            else payments + PaymentEntry(
                                method = selectedMethod,
                                amount = remaining,
                                referenceNumber = referenceNum.ifBlank { null },
                            )
                            onPaymentConfirmed(finalPayments, change)
                        },
                        enabled  = canConfirm || isFullyPaid,
                        modifier = Modifier.fillMaxWidth().height(60.dp),
                        colors   = ButtonDefaults.buttonColors(
                            containerColor = Primary600,
                            disabledContainerColor = BgSurface2,
                        ),
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Icon(Icons.Filled.CheckCircle, null, modifier = Modifier.size(24.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(
                            text  = if (isFullyPaid) "Konfirmasi Pembayaran"
                                    else "Bayar ${remaining.toRupiah()}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun PaymentMethodCard(
    method: PaymentMethod,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        colors  = CardDefaults.cardColors(
            containerColor = if (isSelected) method.bgColor else BgSurface,
        ),
        border  = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) method.textColor else BorderSubtle,
        ),
        elevation = CardDefaults.cardElevation(0.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        if (isSelected) method.textColor.copy(alpha = 0.2f) else BgSurface2,
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(method.icon, null, tint = if (isSelected) method.textColor else TextSecondary)
            }

            Text(
                text       = method.label,
                style      = MaterialTheme.typography.titleMedium,
                color      = if (isSelected) method.textColor else TextPrimary,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                modifier   = Modifier.weight(1f),
            )

            if (isSelected) {
                Icon(
                    Icons.Filled.CheckCircle,
                    null,
                    tint = method.textColor,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun PaymentEntryChip(entry: PaymentEntry, onRemove: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = entry.method.bgColor),
        border = BorderStroke(1.dp, entry.method.textColor.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(entry.method.icon, null, tint = entry.method.textColor, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text(entry.method.label, style = MaterialTheme.typography.bodySmall,
                color = entry.method.textColor, modifier = Modifier.weight(1f))
            Text(entry.amount.toRupiah(), style = MaterialTheme.typography.bodySmall,
                color = entry.method.textColor, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onRemove, modifier = Modifier.size(20.dp)) {
                Icon(Icons.Filled.Close, null, tint = entry.method.textColor, modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
private fun NumPad(
    onDigit: (String) -> Unit,
    onDelete: () -> Unit,
    onClear: () -> Unit,
) {
    val keys = listOf(
        listOf("7", "8", "9"),
        listOf("4", "5", "6"),
        listOf("1", "2", "3"),
        listOf("000", "0", "⌫"),
    )

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        keys.forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                row.forEach { key ->
                    NumPadKey(
                        key      = key,
                        modifier = Modifier.weight(1f),
                        onClick  = {
                            when (key) {
                                "⌫"  -> onDelete()
                                "C"  -> onClear()
                                else -> onDigit(key)
                            }
                        },
                        isDelete = key == "⌫",
                    )
                }
            }
        }
    }
}

@Composable
private fun NumPadKey(
    key: String,
    modifier: Modifier,
    isDelete: Boolean,
    onClick: () -> Unit,
) {
    Button(
        onClick  = onClick,
        modifier = modifier.height(60.dp),
        colors   = ButtonDefaults.buttonColors(
            containerColor = if (isDelete) Error500.copy(alpha = 0.15f) else BgSurface2,
            contentColor   = if (isDelete) Error500 else TextPrimary,
        ),
        shape = MaterialTheme.shapes.medium,
        elevation = ButtonDefaults.buttonElevation(0.dp),
    ) {
        Text(
            text       = key,
            style      = MaterialTheme.typography.headlineSmall,
            fontWeight = if (isDelete) FontWeight.Normal else FontWeight.SemiBold,
        )
    }
}

@Composable
private fun LabelValue(label: String, value: String, color: Color) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = color, fontWeight = FontWeight.SemiBold)
    }
}

object NumberFormatHelper {
    fun format(amount: Long): String {
        return java.text.NumberFormat.getNumberInstance(java.util.Locale("id", "ID")).format(amount)
    }
}
