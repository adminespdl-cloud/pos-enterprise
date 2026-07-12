// ═══════════════════════════════════════════════════════════════════
// Domain Types — POS Enterprise Web Admin
// ═══════════════════════════════════════════════════════════════════

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'cashier'
export type TransactionStatus = 'completed' | 'voided' | 'pending_sync'
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'voucher' | 'points'
export type ShiftStatus = 'open' | 'closed'
export type MemberTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type ProductStatus = 'active' | 'inactive' | 'deleted'

export interface PaginatedResponse<T> {
  data: { data: T[]; current_page: number; last_page: number; total: number; per_page: number }
  status: string
}
export interface ApiResponse<T> { data: T; status: string; message?: string }

// ── Auth ─────────────────────────────────────────────────────────
export interface AuthUser {
  id: string; name: string; email: string | null; role: UserRole; company_id: string
  outlets: { id: string; name: string }[]
}
export interface LoginResponse { token: string; expires_at: string; user: AuthUser }

// ── Company / Outlet ──────────────────────────────────────────────
export interface Outlet {
  id: string; company_id: string; name: string; address: string | null
  city: string | null; phone: string | null; email: string | null
  tax_rate: number; is_active: boolean
  active_payment_methods: PaymentMethod[]
  created_at: string; updated_at: string
}

// ── Product ───────────────────────────────────────────────────────
export interface Category { id: string; name: string; parent_id: string | null; sort_order: number; is_active: boolean }
export interface ProductVariant { id: string; sku: string | null; attributes: Record<string, string>; price: number; is_active: boolean }
export interface Product {
  id: string; name: string; sku: string | null; barcode: string | null
  base_price: number; cost_price: number; unit: string
  status: ProductStatus; is_track_stock: boolean; has_variants: boolean
  image_url: string | null; category: Category | null
  variants: ProductVariant[]; updated_at: string
  stock?: number
}

// ── Inventory ─────────────────────────────────────────────────────
export interface InventoryStock { product_id: string; variant_id: string | null; outlet_id: string; quantity: number; minimum_stock: number }
export interface LowStockAlert { product_name: string; quantity: number; minimum_stock: number; outlet_name: string }

// ── Shift ────────────────────────────────────────────────────────
export interface Shift {
  id: string; outlet_id: string; cashier: { id: string; name: string }
  status: ShiftStatus; opened_at: string; closed_at: string | null
  opening_cash: number; closing_cash: number | null
  expected_cash: number | null; cash_difference: number | null; notes: string | null
}
export interface ShiftSummary {
  total_revenue: number; total_transactions: number; void_count: number
  payment_breakdown: Record<PaymentMethod, number>
}

// ── Transaction ───────────────────────────────────────────────────
export interface TransactionItem {
  product_id: string; variant_id: string | null; product_name: string; variant_name: string | null
  unit_price: number; qty: number; discount: number; tax_amount: number; subtotal: number
}
export interface Payment { method: PaymentMethod; amount: number }
export interface Transaction {
  id: string; transaction_number: string; status: TransactionStatus
  outlet_id: string; shift_id: string | null
  cashier: { id: string; name: string }
  member: { id: string; name: string; phone: string | null; tier: MemberTier } | null
  subtotal: number; discount_amount: number; tax_amount: number; total_amount: number
  points_earned: number; points_redeemed: number
  void_reason: string | null; voided_at: string | null
  items?: TransactionItem[]; payments?: Payment[]
  created_at: string
}

// ── Member ────────────────────────────────────────────────────────
export interface Member {
  id: string; name: string; phone: string | null; email: string | null
  tier: MemberTier; points_balance: number
  total_transaction_count: number; total_transaction_amount: number
  is_active: boolean; birth_date: string | null; created_at: string
}

// ── Reports ───────────────────────────────────────────────────────
export interface SalesDataPoint { period: string; transaction_count: number; revenue: number; total_discount: number; total_tax: number }
export interface TopProduct { product_id: string; product_name: string; total_qty: number; total_revenue: number; transaction_count: number }
export interface DashboardData {
  today_revenue: number; yesterday_revenue: number; revenue_growth: number
  today_transactions: number; today_void: number
  new_members_today: number; critical_stock: number
  weekly_chart: { date: string; revenue: number; count: number }[]
}
export interface PaymentBreakdown { method: PaymentMethod; total: number; count: number }
export interface SalesReport { summary: { total_transactions: number; total_revenue: number; avg_transaction: number; total_discount: number }; void_count: number; by_period: SalesDataPoint[]; payment_breakdown: PaymentBreakdown[] }
