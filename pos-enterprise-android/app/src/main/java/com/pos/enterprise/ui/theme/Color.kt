package com.pos.enterprise.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ═══════════════════════════════════════════════════════════════════
// COLOR TOKENS — Light Theme v2.0 — Biru / Putih / Orange / Hijau
// ═══════════════════════════════════════════════════════════════════

// Primary — Blue
val Primary50  = Color(0xFFE3F2FD)
val Primary100 = Color(0xFFBBDEFB)
val Primary200 = Color(0xFF90CAF9)
val Primary300 = Color(0xFF64B5F6)
val Primary400 = Color(0xFF42A5F5)
val Primary500 = Color(0xFF2196F3)
val Primary600 = Color(0xFF1E88E5)  // ← MAIN PRIMARY
val Primary700 = Color(0xFF1976D2)
val Primary800 = Color(0xFF1565C0)
val Primary900 = Color(0xFF0D47A1)

// Secondary — Orange
val Secondary400 = Color(0xFFFFA726)
val Secondary500 = Color(0xFFFF9800)  // ← MAIN SECONDARY
val Secondary600 = Color(0xFFFB8C00)

// Semantic — Green (Success)
val Success100 = Color(0xFFE8F5E9)
val Success500 = Color(0xFF4CAF50)
val Success700 = Color(0xFF2E7D32)

// Warning — Amber
val Warning100 = Color(0xFFFFF8E1)
val Warning500 = Color(0xFFFFC107)
val Warning700 = Color(0xFFFF8F00)

// Error — Red
val Error100   = Color(0xFFFFEBEE)
val Error500   = Color(0xFFF44336)
val Error700   = Color(0xFFD32F2F)

val Info500    = Color(0xFF29B6F6)

// ═══════════════════════════════════════════════════════════════════
// LIGHT MODE SURFACES
// ═══════════════════════════════════════════════════════════════════

val BgBase      = Color(0xFFFFFFFF)
val BgElevated  = Color(0xFFF5F7FA)  // ← Background utama (sangat terang)
val BgSurface   = Color(0xFFFFFFFF)  // ← Card, panel (putih)
val BgSurface2  = Color(0xFFEEF2F7)  // ← Hover state / secondary bg
val BgSurface3  = Color(0xFFE3E8EF)  // ← Modal backdrop

val BorderSubtle  = Color(0xFFE8ECF1)
val BorderDefault = Color(0xFFD0D7E2)
val BorderStrong  = Color(0xFFB0BEC5)

// Text colors for light mode
val TextPrimary   = Color(0xFF1A2332)   // Dark text on light bg
val TextSecondary = Color(0xFF546E7A)
val TextTertiary  = Color(0xFF90A4AE)
val TextDisabled  = Color(0xFFB0BEC5)

// Payment method colors — Light Mode
val CashBg     = Color(0xFFE8F5E9)
val CashText   = Color(0xFF2E7D32)
val QrisBg     = Color(0xFFE3F2FD)
val QrisText   = Color(0xFF1565C0)
val TransferBg = Color(0xFFFFF3E0)
val TransferText = Color(0xFFE65100)

// ═══════════════════════════════════════════════════════════════════
// MATERIAL 3 COLOR SCHEME — Light Mode (DEFAULT)
// ═══════════════════════════════════════════════════════════════════
private val LightColorScheme = lightColorScheme(
    primary          = Primary600,
    onPrimary        = Color.White,
    primaryContainer = Primary100,
    onPrimaryContainer = Primary900,

    secondary        = Secondary500,
    onSecondary      = Color.White,
    secondaryContainer = Color(0xFFFFF3E0),
    onSecondaryContainer = Color(0xFFE65100),

    tertiary         = Success500,
    onTertiary       = Color.White,
    tertiaryContainer = Success100,
    onTertiaryContainer = Success700,

    error            = Error500,
    onError          = Color.White,
    errorContainer   = Error100,
    onErrorContainer = Error700,

    background       = BgElevated,
    onBackground     = TextPrimary,
    surface          = BgSurface,
    onSurface        = TextPrimary,
    surfaceVariant   = BgSurface2,
    onSurfaceVariant = TextSecondary,
    outline          = BorderDefault,
    outlineVariant   = BorderSubtle,

    inverseSurface   = Color(0xFF2D3748),
    inverseOnSurface = Color(0xFFF5F7FA),
    inversePrimary   = Primary200,
)

// Dark scheme (tersedia tapi tidak dipakai secara default)
private val DarkColorScheme = darkColorScheme(
    primary          = Primary400,
    onPrimary        = Primary900,
    primaryContainer = Primary700,
    onPrimaryContainer = Primary200,

    secondary        = Secondary400,
    onSecondary      = Color(0xFF4E2600),
    secondaryContainer = Color(0xFF6B3A00),
    onSecondaryContainer = Secondary400,

    error            = Color(0xFFEF9A9A),
    onError          = Color(0xFF690005),
    errorContainer   = Color(0xFF93000A),
    onErrorContainer = Error100,

    background       = Color(0xFF121212),
    onBackground     = Color(0xFFE0E0E0),
    surface          = Color(0xFF1E1E1E),
    onSurface        = Color(0xFFE0E0E0),
    surfaceVariant   = Color(0xFF2C2C2C),
    onSurfaceVariant = Color(0xFFB0B0B0),
    outline          = Color(0xFF444444),
    outlineVariant   = Color(0xFF333333),
)

// ═══════════════════════════════════════════════════════════════════
// APP THEME
// ═══════════════════════════════════════════════════════════════════
@Composable
fun PosEnterpriseTheme(
    darkTheme: Boolean = false,   // Default: LIGHT mode
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = PosTypography,
        shapes      = PosShapes,
        content     = content,
    )
}
