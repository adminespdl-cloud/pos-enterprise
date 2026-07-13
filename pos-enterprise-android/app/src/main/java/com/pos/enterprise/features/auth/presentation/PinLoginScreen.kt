package com.pos.enterprise.features.auth.presentation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pos.enterprise.ui.theme.*
import kotlinx.coroutines.delay

private const val PIN_LENGTH = 6

// ═══════════════════════════════════════════════════════════════════
// PIN LOGIN SCREEN
// Digunakan kasir untuk login cepat dengan PIN 6 digit
// ═══════════════════════════════════════════════════════════════════

@Composable
fun PinLoginScreen(
    cashierName: String,
    outletName: String,
    onPinComplete: (String) -> Unit,
    onSwitchToEmailLogin: () -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null,
) {
    var pin          by remember { mutableStateOf("") }
    var shakeOffset  by remember { mutableStateOf(0f) }
    val shakeAnim    = remember { Animatable(0f) }

    // Guncang jika error
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            pin = ""
            shakeAnim.animateTo(
                targetValue    = 0f,
                animationSpec  = keyframes {
                    durationMillis = 500
                    10f at 0
                    -10f at 100
                    10f at 200
                    -10f at 300
                    5f at 400
                    0f at 500
                }
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors  = listOf(Color.White, Primary50),
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .widthIn(max = 360.dp)
                .offset(x = shakeAnim.value.dp),
        ) {
            // ── Logo ──────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(
                        Brush.linearGradient(listOf(Primary600, Secondary500)),
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.Store,
                    null,
                    tint     = Color.White,
                    modifier = Modifier.size(36.dp),
                )
            }

            Spacer(Modifier.height(20.dp))

            Text(
                text       = outletName,
                style      = MaterialTheme.typography.bodyMedium,
                color      = TextSecondary,
            )
            Text(
                text       = cashierName,
                style      = MaterialTheme.typography.headlineMedium,
                color      = TextPrimary,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text  = "Masukkan PIN 6 digit",
                style = MaterialTheme.typography.bodySmall,
                color = TextTertiary,
            )

            Spacer(Modifier.height(32.dp))

            // ── PIN Dots ──────────────────────────────────────────
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(PIN_LENGTH) { index ->
                    val filled = index < pin.length
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .background(
                                color = when {
                                    errorMessage != null -> Error500
                                    filled -> Primary600
                                    else   -> BorderDefault
                                },
                                shape = CircleShape,
                            )
                    )
                }
            }

            // Error message
            AnimatedVisibility(visible = errorMessage != null) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text      = errorMessage ?: "",
                        style     = MaterialTheme.typography.bodySmall,
                        color     = Error500,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            // ── Numpad ────────────────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                val rows = listOf(
                    listOf("1","2","3"),
                    listOf("4","5","6"),
                    listOf("7","8","9"),
                    listOf("","0","⌫"),
                )
                rows.forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { key ->
                            if (key.isEmpty()) {
                                Spacer(Modifier.size(72.dp))
                            } else {
                                PinKey(
                                    key      = key,
                                    enabled  = !isLoading,
                                    onClick  = {
                                        if (key == "⌫") {
                                            if (pin.isNotEmpty()) pin = pin.dropLast(1)
                                        } else if (pin.length < PIN_LENGTH) {
                                            pin += key
                                            if (pin.length == PIN_LENGTH) {
                                                onPinComplete(pin)
                                            }
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(28.dp))

            // ── Loading indicator ─────────────────────────────────
            AnimatedVisibility(visible = isLoading) {
                CircularProgressIndicator(
                    color    = Primary600,
                    modifier = Modifier.size(28.dp),
                    strokeWidth = 3.dp,
                )
            }

            Spacer(Modifier.height(20.dp))

            // ── Switch to email login ─────────────────────────────
            TextButton(onClick = onSwitchToEmailLogin) {
                Icon(Icons.Outlined.Email, null,
                    modifier = Modifier.size(16.dp), tint = TextTertiary)
                Spacer(Modifier.width(6.dp))
                Text(
                    text  = "Login dengan Email",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextTertiary,
                )
            }
        }
    }
}

@Composable
private fun PinKey(key: String, enabled: Boolean, onClick: () -> Unit) {
    val isDelete = key == "⌫"
    val interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }

    Box(
        modifier = Modifier
            .size(72.dp)
            .background(
                color = if (isDelete) Error500.copy(0.1f) else BgSurface2,
                shape = CircleShape,
            )
            .border(1.dp, if (isDelete) Error500.copy(0.3f) else BorderDefault, CircleShape)
            .clickable(
                enabled           = enabled,
                interactionSource = interactionSource,
                indication        = null,
                onClick           = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (isDelete) {
            Icon(Icons.Filled.Backspace, null, tint = Error500, modifier = Modifier.size(22.dp))
        } else {
            Text(
                text       = key,
                style      = MaterialTheme.typography.headlineMedium,
                color      = TextPrimary,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
