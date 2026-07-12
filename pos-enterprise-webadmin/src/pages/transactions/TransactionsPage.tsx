import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Filter, Eye, XCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { transactionApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { formatRupiah, fmtDateTime, TRX_STATUS_CONFIG, PAYMENT_LABELS } from '@/utils/formatters'
import type { Transaction, TransactionStatus } from '@/types'

// ── Void Modal ──────────────────────────────────────────────────────
function VoidModal({ trx, onClose, onConfirm }: {
  trx: Transaction; onClose: () => void
  onConfirm: (reason: string, pin: string) => void
}) {
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="card" style={{ width: 420, border: '1px solid var(--border-strong)' }}>
        <h3 className="text-lg font-semibold text-primary mb-1">Batalkan Transaksi</h3>
        <p className="text-sm text-secondary mb-4">
          {trx.transaction_number} · {formatRupiah(trx.total_amount)}
        </p>
        <div className="form-group mb-3">
          <label className="form-label">Alasan Pembatalan *</label>
          <textarea
            className="form-input" rows={2}
            placeholder="Contoh: Salah produk..."
            value={reason} onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="form-group mb-4">
          <label className="form-label">PIN Manajer *</label>
          <input
            className="form-input" type="password" maxLength={6}
            placeholder="6 digit PIN"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={() => onConfirm(reason, pin)}
            disabled={!reason.trim() || pin.length < 6}>
            <XCircle size={16} /> Batalkan Transaksi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction Detail Modal ────────────────────────────────────────
function DetailModal({ trx, onClose }: { trx: Transaction; onClose: () => void }) {
  const statusCfg = TRX_STATUS_CONFIG[trx.status]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="card" style={{ width: 540, maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">{trx.transaction_number}</h3>
            <p className="text-xs text-secondary mt-1">{fmtDateTime(trx.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${statusCfg.badge}`}>{statusCfg.label}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Kasir & Member */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-secondary mb-1">Kasir</p>
            <p className="text-sm font-medium text-primary">{trx.cashier.name}</p>
          </div>
          {trx.member && (
            <div>
              <p className="text-xs text-secondary mb-1">Member</p>
              <p className="text-sm font-medium text-primary">{trx.member.name}</p>
              <p className="text-xs text-secondary">{trx.member.phone}</p>
            </div>
          )}
        </div>

        <hr className="divider" />

        {/* Items */}
        {trx.items && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Item</p>
            {trx.items.map((item, i) => (
              <div key={i} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <p className="text-sm text-primary">{item.product_name}</p>
                  {item.variant_name && <p className="text-xs text-secondary">{item.variant_name}</p>}
                  <p className="text-xs text-secondary">{formatRupiah(item.unit_price)} × {item.qty}</p>
                </div>
                <p className="text-sm font-semibold text-primary">{formatRupiah(item.subtotal)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="flex flex-col gap-1" style={{ background: 'var(--bg-surface2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
          <div className="flex justify-between"><span className="text-xs text-secondary">Subtotal</span><span className="text-xs text-primary">{formatRupiah(trx.subtotal)}</span></div>
          {trx.discount_amount > 0 && <div className="flex justify-between"><span className="text-xs text-secondary">Diskon</span><span className="text-xs" style={{ color: 'var(--color-success-500)' }}>-{formatRupiah(trx.discount_amount)}</span></div>}
          {trx.tax_amount > 0 && <div className="flex justify-between"><span className="text-xs text-secondary">Pajak</span><span className="text-xs text-primary">{formatRupiah(trx.tax_amount)}</span></div>}
          <hr className="divider" style={{ margin: '6px 0' }} />
          <div className="flex justify-between"><span className="text-sm font-bold text-primary">Total</span><span className="text-base font-extrabold" style={{ color: 'var(--color-primary-400)' }}>{formatRupiah(trx.total_amount)}</span></div>
        </div>

        {/* Payments */}
        {trx.payments && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Pembayaran</p>
            {trx.payments.map((p, i) => (
              <div key={i} className="flex justify-between py-1">
                <span className="badge badge-info text-xs">{PAYMENT_LABELS[p.method]}</span>
                <span className="text-sm font-medium text-primary">{formatRupiah(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {trx.void_reason && (
          <div className="mt-4 p-3" style={{ background: 'var(--color-error-700)', borderRadius: 'var(--radius-sm)', opacity: 0.8 }}>
            <p className="text-xs font-semibold text-primary mb-1">Alasan Void</p>
            <p className="text-xs text-secondary">{trx.void_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTIONS PAGE
// ═══════════════════════════════════════════════════════════════════
export function TransactionsPage() {
  const { currentOutletId } = useAuthStore()
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TransactionStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [detailTrx, setDetailTrx] = useState<Transaction | null>(null)
  const [voidTrx,   setVoidTrx]   = useState<Transaction | null>(null)

  const { data, isLoading, refetch } = useQuery(
    ['transactions', currentOutletId, page, status, dateFrom, dateTo],
    () => transactionApi.list({
      outlet_id: currentOutletId ?? undefined,
      status:    status || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
      per_page: 20,
      page,
    }).then(r => r.data),
    { keepPreviousData: true, staleTime: 10_000 },
  )

  const rows: Transaction[] = data?.data?.data ?? DEMO_TRX
  const total = data?.data?.total ?? DEMO_TRX.length
  const lastPage = data?.data?.last_page ?? 1

  return (
    <div>
      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="topbar-search" style={{ minWidth: 240 }}>
            <Search size={15} color="var(--text-tertiary)" />
            <input placeholder="No. transaksi, kasir..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>

          <select className="form-input form-select text-sm" style={{ width: 160 }}
            value={status} onChange={e => { setStatus(e.target.value as TransactionStatus | ''); setPage(1) }}>
            <option value="">Semua Status</option>
            <option value="completed">Selesai</option>
            <option value="voided">Void</option>
          </select>

          <input type="date" className="form-input text-sm" style={{ width: 150 }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-secondary text-sm">—</span>
          <input type="date" className="form-input text-sm" style={{ width: 150 }}
            value={dateTo} onChange={e => setDateTo(e.target.value)} />

          <button className="btn btn-ghost btn-sm" onClick={() => { setStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }}>
            Reset
          </button>

          <button className="btn btn-secondary btn-sm ml-auto">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary Chips ──────────────────────────────────────── */}
      <div className="flex gap-3 mb-4">
        {[
          { label: 'Total', value: total },
          { label: 'Selesai', value: rows.filter(r => r.status === 'completed').length, badge: 'badge-success' },
          { label: 'Void',    value: rows.filter(r => r.status === 'voided').length,    badge: 'badge-error' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-2" style={{ padding: '8px 16px' }}>
            <span className="text-xs text-secondary">{s.label}</span>
            <span className={`badge ${s.badge ?? 'badge-gray'}`}>{s.value}</span>
          </div>
        ))}

        {rows.length > 0 && (
          <div className="card flex items-center gap-2 ml-auto" style={{ padding: '8px 16px' }}>
            <span className="text-xs text-secondary">Total Nilai</span>
            <span className="text-sm font-bold" style={{ color: 'var(--color-primary-400)' }}>
              {formatRupiah(rows.filter(r => r.status === 'completed').reduce((s, r) => s + r.total_amount, 0))}
            </span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="card p-0">
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>Memuat...</div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-md)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>No. Transaksi</th>
                  <th>Waktu</th>
                  <th>Kasir</th>
                  <th>Member</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(trx => {
                  const sc = TRX_STATUS_CONFIG[trx.status]
                  return (
                    <tr key={trx.id}>
                      <td>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-primary-400)' }}>
                          {trx.transaction_number}
                        </span>
                      </td>
                      <td className="text-sm text-secondary">{fmtDateTime(trx.created_at)}</td>
                      <td className="text-sm">{trx.cashier.name}</td>
                      <td>
                        {trx.member
                          ? <div><p className="text-sm">{trx.member.name}</p><p className="text-xs text-secondary">{trx.member.phone}</p></div>
                          : <span className="text-secondary text-xs">—</span>}
                      </td>
                      <td className="text-sm text-secondary">{trx.items?.length ?? '—'} item</td>
                      <td className="text-sm font-semibold">{formatRupiah(trx.total_amount)}</td>
                      <td>
                        {trx.payments?.map((p, i) => (
                          <span key={i} className="badge badge-info text-xs mr-1">{PAYMENT_LABELS[p.method]}</span>
                        )) ?? <span className="text-xs text-secondary">—</span>}
                      </td>
                      <td><span className={`badge ${sc.badge}`} style={{ fontSize: '.7rem' }}>{sc.label}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-icon btn-sm" title="Detail"
                            onClick={() => setDetailTrx(trx)}>
                            <Eye size={14} />
                          </button>
                          {trx.status === 'completed' && (
                            <button className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--color-error-500)' }} title="Void"
                              onClick={() => setVoidTrx(trx)}>
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs text-secondary">Menampilkan {rows.length} dari {total} transaksi</p>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-secondary" style={{ lineHeight: '30px' }}>Hal {page} / {lastPage}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {detailTrx && <DetailModal trx={detailTrx} onClose={() => setDetailTrx(null)} />}
      {voidTrx && (
        <VoidModal trx={voidTrx} onClose={() => setVoidTrx(null)}
          onConfirm={(reason, pin) => {
            transactionApi.void(voidTrx.id, { void_reason: reason, manager_pin: pin })
              .then(() => { setVoidTrx(null); refetch() })
              .catch(e => alert(e.response?.data?.message ?? 'Gagal void'))
          }}
        />
      )}
    </div>
  )
}

// ── Demo data untuk preview tanpa API ──────────────────────────────
const DEMO_TRX: Transaction[] = Array.from({ length: 12 }, (_, i) => ({
  id: `trx-${i}`,
  transaction_number: `TRX-CNTR-20260712-${String(87 - i).padStart(4, '0')}`,
  status: i === 3 ? 'voided' : 'completed',
  outlet_id: 'demo',
  shift_id: 'shift-1',
  cashier: { id: 'c1', name: i % 2 === 0 ? 'Andi Prasetyo' : 'Budi Santoso' },
  member: i % 3 === 0 ? { id: 'm1', name: 'Siti Rahayu', phone: '081234567890', tier: 'gold' } : null,
  subtotal: (i + 1) * 45_000,
  discount_amount: i % 4 === 0 ? 5_000 : 0,
  tax_amount: 0,
  total_amount: (i + 1) * 45_000 - (i % 4 === 0 ? 5_000 : 0),
  points_earned: Math.floor(((i + 1) * 45) / 1000),
  points_redeemed: 0,
  void_reason: i === 3 ? 'Salah input produk' : null,
  voided_at: i === 3 ? '2026-07-12T10:30:00Z' : null,
  items: [{ product_id: 'p1', variant_id: null, product_name: 'Kopi Susu', variant_name: null, unit_price: 25_000, qty: 1, discount: 0, tax_amount: 0, subtotal: 25_000 }],
  payments: [{ method: i % 2 === 0 ? 'qris' : 'cash', amount: (i + 1) * 45_000 }],
  created_at: `2026-07-12T${String(13 - i % 5).padStart(2, '0')}:${String(42 - i * 3).padStart(2, '0')}:00Z`,
}))
