import type { PaymentMethod, MemberTier, TransactionStatus, ProductStatus } from '@/types'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

// ── Currency ────────────────────────────────────────────────────────
export function formatRupiah(amount: number, compact = false): string {
  if (compact && amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
  }
  if (compact && amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

// ── Date ────────────────────────────────────────────────────────────
export function fmtDate(iso: string, fmt = 'dd MMM yyyy'): string {
  return format(parseISO(iso), fmt, { locale: localeId })
}
export function fmtDateTime(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy · HH:mm', { locale: localeId })
}
export function fmtTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

// ── Percent ─────────────────────────────────────────────────────────
export function fmtGrowth(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

// ── Labels ──────────────────────────────────────────────────────────
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', voucher: 'Voucher', points: 'Poin',
}

export const TIER_CONFIG: Record<MemberTier, { label: string; color: string; bg: string }> = {
  bronze:   { label: 'Bronze',   color: '#CD7F32', bg: 'rgba(205,127,50,.15)' },
  silver:   { label: 'Silver',   color: '#9CA3AF', bg: 'rgba(156,163,175,.15)' },
  gold:     { label: 'Gold',     color: '#F59E0B', bg: 'rgba(245,158,11,.15)' },
  platinum: { label: 'Platinum', color: '#A78BFA', bg: 'rgba(167,139,250,.15)' },
}

export const TRX_STATUS_CONFIG: Record<TransactionStatus, { label: string; badge: string }> = {
  completed:    { label: 'Selesai',     badge: 'badge-success' },
  voided:       { label: 'Dibatalkan',  badge: 'badge-error' },
  pending_sync: { label: 'Pending Sync',badge: 'badge-warning' },
}

export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, { label: string; badge: string }> = {
  active:   { label: 'Aktif',    badge: 'badge-success' },
  inactive: { label: 'Nonaktif', badge: 'badge-warning' },
  deleted:  { label: 'Dihapus',  badge: 'badge-error' },
}

// ── Debounce ────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 300) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
