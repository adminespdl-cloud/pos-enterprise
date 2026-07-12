package com.pos.enterprise

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.pos.enterprise.features.auth.presentation.PinLoginScreen
import com.pos.enterprise.features.cashier.presentation.CashierScreen
import com.pos.enterprise.features.payment.presentation.PaymentScreen
import com.pos.enterprise.ui.theme.PosEnterpriseTheme
import dagger.hilt.android.AndroidEntryPoint

// Route constants
object Routes {
    const val PIN_LOGIN  = "pin_login"
    const val CASHIER    = "cashier"
    const val PAYMENT    = "payment/{total}"
    const val HISTORY    = "history"
    const val SHIFT      = "shift"

    fun payment(total: Long) = "payment/$total"
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Cegah screenshot (keamanan data transaksi)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)

        setContent {
            PosEnterpriseTheme(darkTheme = true) {
                PosNavHost()
            }
        }
    }
}

@Composable
fun PosNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController    = navController,
        startDestination = Routes.PIN_LOGIN,
    ) {
        // ── PIN Login ────────────────────────────────────────────
        composable(Routes.PIN_LOGIN) {
            PinLoginScreen(
                cashierName       = "Andi Prasetyo",   // dari ViewModel/DataStore
                outletName        = "Cabang Selatan",
                onPinComplete     = { _ ->
                    navController.navigate(Routes.CASHIER) {
                        popUpTo(Routes.PIN_LOGIN) { inclusive = true }
                    }
                },
                onSwitchToEmailLogin = { /* Navigate to email login */ },
                isLoading         = false,
                errorMessage      = null,
            )
        }

        // ── Cashier (Main) ───────────────────────────────────────
        composable(Routes.CASHIER) {
            CashierScreen(
                onNavigateToPayment = { total ->
                    navController.navigate(Routes.payment(total))
                },
                onNavigateToHistory = {
                    navController.navigate(Routes.HISTORY)
                },
                onNavigateToShift   = {
                    navController.navigate(Routes.SHIFT)
                },
            )
        }

        // ── Payment ──────────────────────────────────────────────
        composable(
            route     = Routes.PAYMENT,
            arguments = listOf(navArgument("total") { type = NavType.LongType }),
        ) { backStackEntry ->
            val total = backStackEntry.arguments?.getLong("total") ?: 0L
            PaymentScreen(
                totalAmount        = total,
                onPaymentConfirmed = { _, _ ->
                    // Kembali ke kasir + clear cart (event dari ViewModel)
                    navController.navigate(Routes.CASHIER) {
                        popUpTo(Routes.CASHIER) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ── History ──────────────────────────────────────────────
        composable(Routes.HISTORY) {
            // TransactionHistoryScreen — TODO di iterasi berikutnya
            androidx.compose.material3.Surface(
                modifier = Modifier,
                color    = com.pos.enterprise.ui.theme.BgElevated,
            ) {
                androidx.compose.material3.Text(
                    "Riwayat Transaksi — Coming Soon",
                    color    = com.pos.enterprise.ui.theme.TextPrimary,
                    modifier = androidx.compose.ui.Modifier.padding(24.dp),
                )
            }
        }

        // ── Shift ─────────────────────────────────────────────────
        composable(Routes.SHIFT) {
            // ShiftScreen — TODO di iterasi berikutnya
            androidx.compose.material3.Surface(
                modifier = Modifier,
                color    = com.pos.enterprise.ui.theme.BgElevated,
            ) {
                androidx.compose.material3.Text(
                    "Manajemen Shift — Coming Soon",
                    color    = com.pos.enterprise.ui.theme.TextPrimary,
                    modifier = androidx.compose.ui.Modifier.padding(24.dp),
                )
            }
        }
    }
}

private val Modifier get() = androidx.compose.ui.Modifier
private val Modifier.padding get() = this
private fun androidx.compose.ui.Modifier.padding(all: androidx.compose.ui.unit.Dp) = this
