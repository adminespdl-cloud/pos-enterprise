import { describe, it, expect } from 'vitest'
import {
  formatRupiah,
  fmtGrowth,
  TIER_CONFIG,
  PAYMENT_LABELS,
  TRX_STATUS_CONFIG,
} from '@/utils/formatters'

// ── formatRupiah ─────────────────────────────────────────────────────

describe('formatRupiah', () => {
  it('memformat angka 0 sebagai Rp 0', () => {
    expect(formatRupiah(0)).toBe('Rp\u00a00')
  })

  it('memformat 25000 sebagai Rp 25.000', () => {
    expect(formatRupiah(25_000)).toContain('25.000')
  })

  it('memformat 1000000 sebagai Rp 1.000.000', () => {
    expect(formatRupiah(1_000_000)).toContain('1.000.000')
  })

  it('compact: 1.500.000 → Rp 1.5jt', () => {
    expect(formatRupiah(1_500_000, true)).toBe('Rp 1.5jt')
  })

  it('compact: 500.000 → Rp 500rb', () => {
    expect(formatRupiah(500_000, true)).toBe('Rp 500rb')
  })

  it('compact: 999 tidak diubah ke rb', () => {
    // 999 < 1000, tetap format biasa
    const result = formatRupiah(999, true)
    expect(result).toContain('999')
    expect(result).not.toContain('rb')
  })
})

// ── fmtGrowth ─────────────────────────────────────────────────────────

describe('fmtGrowth', () => {
  it('pertumbuhan positif punya prefix +', () => {
    expect(fmtGrowth(12.4)).toBe('+12.4%')
  })

  it('pertumbuhan negatif tidak punya prefix +', () => {
    expect(fmtGrowth(-5.3)).toBe('-5.3%')
  })

  it('pertumbuhan 0 punya prefix +', () => {
    expect(fmtGrowth(0)).toBe('+0.0%')
  })
})

// ── TIER_CONFIG ───────────────────────────────────────────────────────

describe('TIER_CONFIG', () => {
  it('semua tier memiliki label, color, dan bg', () => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const
    for (const tier of tiers) {
      const cfg = TIER_CONFIG[tier]
      expect(cfg.label).toBeTruthy()
      expect(cfg.color).toBeTruthy()
      expect(cfg.bg).toBeTruthy()
    }
  })

  it('label platinum adalah Platinum', () => {
    expect(TIER_CONFIG.platinum.label).toBe('Platinum')
  })
})

// ── PAYMENT_LABELS ───────────────────────────────────────────────────

describe('PAYMENT_LABELS', () => {
  it('cash → Tunai', () => expect(PAYMENT_LABELS.cash).toBe('Tunai'))
  it('qris → QRIS', () => expect(PAYMENT_LABELS.qris).toBe('QRIS'))
  it('transfer → Transfer Bank', () => expect(PAYMENT_LABELS.transfer).toBe('Transfer Bank'))
  it('voucher → Voucher', () => expect(PAYMENT_LABELS.voucher).toBe('Voucher'))
  it('points → Poin', () => expect(PAYMENT_LABELS.points).toBe('Poin'))
})

// ── TRX_STATUS_CONFIG ─────────────────────────────────────────────────

describe('TRX_STATUS_CONFIG', () => {
  it('completed menggunakan badge-success', () => {
    expect(TRX_STATUS_CONFIG.completed.badge).toBe('badge-success')
  })

  it('voided menggunakan badge-error', () => {
    expect(TRX_STATUS_CONFIG.voided.badge).toBe('badge-error')
  })

  it('pending_sync menggunakan badge-warning', () => {
    expect(TRX_STATUS_CONFIG.pending_sync.badge).toBe('badge-warning')
  })
})
