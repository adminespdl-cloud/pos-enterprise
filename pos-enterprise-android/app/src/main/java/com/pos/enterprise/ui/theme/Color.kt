package com.pos.enterprise.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ═══════════════════════════════════════════════════════════════════
// COLOR TOKENS — Sesuai Design System v1.0.0
// ═══════════════════════════════════════════════════════════════════

// Primary — Violet
val Primary50  = Color(0xFFF5F3FF)
val Primary100 = Color(0xFFEDE9FE)
val Primary200 = Color(0xFFDDD6FE)
val Primary300 = Color(0xFFC4B5FD)
val Primary400 = Color(0xFFA78BFA)
val Primary500 = Color(0xFF8B5CF6)
val Primary600 = Color(0xFF7C3AED)  // ← MAIN PRIMARY
val Primary700 = Color(0xFF6D28D9)
val Primary800 = Color(0xFF5B21B6)
val Primary900 = Color(0xFF4C1D95)

// Secondary — Cyan
val Secondary400 = Color(0xFF22D3EE)
val Secondary500 = Color(0xFF06B6D4)  // ← MAIN SECONDARY
val Secondary600 = Color(0xFF0891B2)

// Semantic
val Success100 = Color(0xFFD1FAE5)
val Success500 = Color(0xFF10B981)
val Success700 = Color(0xFF047857)

val Warning100 = Color(0xFFFEF3C7)
val Warning500 = Color(0xFFF59E0B)
val Warning700 = Color(0xFFB45309)

val Error100   = Color(0xFFFFE4E6)
val Error500   = Color(0xFFF43F5E)
val Error700   = Color(0xFFBE123C)

val Info500    = Color(0xFF0EA5E9)

// Dark Mode Surfaces
val BgBase      = Color(0xFF0A0E1A)
val BgElevated  = Color(0xFF0F1724)  // ← Background utama
val BgSurface   = Color(0xFF1A2332)  // ← Card, panel
val BgSurface2  = Color(0xFF243044)  // ← Hover state
val BgSurface3  = Color(0xFF2E3D57)  // ← Modal

val BorderSubtle  = Color(0xFF1E2D42)
val BorderDefault = Color(0xFF2A3D57)
val BorderStrong  = Color(0xFF3D5270)

val TextPrimary   = Color(0xFFF1F5F9)
val TextSecondary = Color(0xFF94A3B8)
val TextTertiary  = Color(0xFF64748B)
val TextDisabled  = Color(0xFF475569)

// Payment method colors
val CashBg     = Color(0xFF064E3B)
val CashText   = Color(0xFF34D399)
val QrisBg     = Color(0xFF1E3A5F)
val QrisText   = Color(0xFF60A5FA)
val TransferBg = Color(0xFF3B1E64)
val TransferText = Color(0xFFA78BFA)

// ═══════════════════════════════════════════════════════════════════
// MATERIAL 3 COLOR SCHEME — Dark Mode
// ═══════════════════════════════════════════════════════════════════
private val DarkColorScheme = darkColorScheme(
    primary          = Primary600,
    onPrimary        = Color.White,
    primaryContainer = Primary800,
    onPrimaryContainer = Primary200,

    secondary        = Secondary500,
    onSecondary      = Color.White,
    secondaryContainer = Color(0xFF0E4D5C),
    onSecondaryContainer = Secondary400,

    error            = Error500,
    onError          = Color.White,
    errorContainer   = Color(0xFF7F1D1D),
    onErrorContainer = Error100,

    background       = BgElevated,
    onBackground     = TextPrimary,
    surface          = BgSurface,
    onSurface        = TextPrimary,
    surfaceVariant   = BgSurface2,
    onSurfaceVariant = TextSecondary,
    outline          = BorderDefault,
    outlineVariant   = BorderSubtle,

    inverseSurface   = TextPrimary,
    inverseOnSurface = BgElevated,
    inversePrimary   = Primary400,
)

private val LightColorScheme = lightColorScheme(
    primary          = Primary600,
    onPrimary        = Color.White,
    primaryContainer = Primary100,
    onPrimaryContainer = Primary900,

    secondary        = Secondary500,
    onSecondary      = Color.White,

    error            = Error500,
    onError          = Color.White,

    background       = Color(0xFFF8FAFC),
    onBackground     = Color(0xFF0F172A),
    surface          = Color.White,
    onSurface        = Color(0xFF0F172A),
    surfaceVariant   = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),
    outline          = Color(0xFFCBD5E1),
)

// ═══════════════════════════════════════════════════════════════════
// APP THEME
// ═══════════════════════════════════════════════════════════════════
@Composable
fun PosEnterpriseTheme(
    darkTheme: Boolean = true,   // Default dark mode
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
