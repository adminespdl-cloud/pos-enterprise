package com.pos.enterprise.features.cashier.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pos.enterprise.core.data.local.dao.ShiftDao
import com.pos.enterprise.core.data.local.entity.ShiftEntity
import com.pos.enterprise.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

// ── ViewModel ──────────────────────────────────────────────────────
@HiltViewModel
class ShiftViewModel @Inject constructor(
    private val shiftDao: ShiftDao
) : ViewModel() {
    private val _activeShift = MutableStateFlow<ShiftEntity?>(null)
    val activeShift: StateFlow<ShiftEntity?> = _activeShift.asStateFlow()

    init {
        viewModelScope.launch {
            shiftDao.getActiveShift().collect { shift ->
                _activeShift.update { shift }
            }
        }
    }

    fun openShift(openingCash: Long) {
        viewModelScope.launch {
            val shift = ShiftEntity(
                id = UUID.randomUUID().toString(),
                outletId = "OUTLET-123", // Simulasi dari DataStore
                cashierId = "USER-123",  // Simulasi dari DataStore
                cashierName = "Andi Prasetyo",
                status = "open",
                openedAt = System.currentTimeMillis(),
                openingCash = openingCash,
                isSynced = false
            )
            shiftDao.upsert(shift)
        }
    }

    fun closeShift(closingCash: Long) {
        viewModelScope.launch {
            val shift = _activeShift.value ?: return@launch
            val expectedCash = shift.openingCash // TODO: Tambahkan revenue dari transaksi
            val diff = closingCash - expectedCash
            
            shiftDao.closeShift(
                id = shift.id,
                closedAt = System.currentTimeMillis(),
                closingCash = closingCash,
                expectedCash = expectedCash,
                diff = diff
            )
        }
    }
}

// ── UI ─────────────────────────────────────────────────────────────
@Composable
fun ShiftScreen(
    onBack: () -> Unit,
    viewModel: ShiftViewModel = hiltViewModel()
) {
    val activeShift by viewModel.activeShift.collectAsState()
    var cashInput by remember { mutableStateOf("") }

    Surface(modifier = Modifier.fillMaxSize(), color = BgElevated) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Kembali", tint = TextSecondary)
                }
                Spacer(Modifier.width(16.dp))
                Text(
                    text = "Manajemen Shift",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(48.dp))

            Card(
                modifier = Modifier.width(400.dp),
                colors = CardDefaults.cardColors(containerColor = BgSurface),
                border = BorderStroke(1.dp, BorderDefault)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (activeShift == null) {
                        Icon(Icons.Filled.LockOpen, null, modifier = Modifier.size(64.dp), tint = Primary400)
                        Spacer(Modifier.height(16.dp))
                        Text("Buka Shift Baru", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        Text("Masukkan saldo awal laci kasir", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        
                        Spacer(Modifier.height(24.dp))
                        OutlinedTextField(
                            value = cashInput,
                            onValueChange = { cashInput = it },
                            label = { Text("Saldo Awal (Rp)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        
                        Spacer(Modifier.height(24.dp))
                        Button(
                            onClick = {
                                viewModel.openShift(cashInput.toLongOrNull()?.times(100L) ?: 0L)
                                onBack()
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary600)
                        ) {
                            Text("Buka Shift")
                        }
                    } else {
                        Icon(Icons.Filled.Lock, null, modifier = Modifier.size(64.dp), tint = Warning500)
                        Spacer(Modifier.height(16.dp))
                        Text("Tutup Shift Aktif", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        
                        Spacer(Modifier.height(24.dp))
                        OutlinedTextField(
                            value = cashInput,
                            onValueChange = { cashInput = it },
                            label = { Text("Saldo Laci Saat Ini (Rp)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        
                        Spacer(Modifier.height(24.dp))
                        Button(
                            onClick = {
                                viewModel.closeShift(cashInput.toLongOrNull()?.times(100L) ?: 0L)
                                onBack()
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Error500)
                        ) {
                            Text("Tutup Shift")
                        }
                    }
                }
            }
        }
    }
}
