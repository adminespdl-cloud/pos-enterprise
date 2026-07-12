import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { Download, Calendar, TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react'
import { reportApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { formatRupiah, fmtDate, PAYMENT_LABELS } from '@/utils/formatters'
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns'
import type { SalesReport, TopProduct, PaymentMethod } from '@/types'

// ── Date Range Presets ───────────────────────────────────────────────
const PRESETS = [
  { label: 'Hari Ini',    days: 0 },
  { label: '7 Hari',     days: 7 },
  { label: '30 Hari',    days: 30 },
  { label: 'Bulan Ini',  days: -1 }, // special
]

// ── Custom Chart Tooltip ─────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-surface3)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {p.name === 'revenue' ? formatRupiah(p.value, true) : `${p.value} transaksi`}
        </p>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════
export function ReportsPage() {
  const { currentOutletId } = useAuthStore()

  const today    = new Date()
  const [dateFrom, setDateFrom] = useState(format(subDays(today, 7), 'yyyy-MM-dd'))
  const [dateTo,   setDateTo]   = useState(format(today, 'yyyy-MM-dd'))
  const [groupBy,  setGroupBy]  = useState<'day' | 'week' | 'month'>('day')
  const [activeTab, setActive]  = useState<'sales' | 'products' | 'payments'>('sales')

  function applyPreset(days: number) {
    if (days === -1) {
      setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
      setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'))
    } else if (days === 0) {
      const d = format(today, 'yyyy-MM-dd')
      setDateFrom(d); setDateTo(d)
    } else {
      setDateFrom(format(subDays(today, days), 'yyyy-MM-dd'))
      setDateTo(format(today, 'yyyy-MM-dd'))
    }
  }

  // ── Sales Report Query ─────────────────────────────────────────
  const { data: salesData, isLoading: salesLoading } = useQuery<{ data: SalesReport }>(
    ['report-sales', currentOutletId, dateFrom, dateTo, groupBy],
    () => reportApi.sales({ date_from: dateFrom, date_to: dateTo, outlet_id: currentOutletId ?? undefined, group_by: groupBy }).then(r => r.data),
    { enabled: activeTab === 'sales', staleTime: 60_000 },
  )

  // ── Top Products Query ─────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: { data: TopProduct[] } }>(
    ['report-products', currentOutletId, dateFrom, dateTo],
    () => reportApi.products({ date_from: dateFrom, date_to: dateTo, outlet_id: currentOutletId ?? undefined, limit: 10 }).then(r => r.data),
    { enabled: activeTab === 'products', staleTime: 60_000 },
  )

  const report     = salesData?.data
  const topProducts: TopProduct[] = productsData?.data?.data ?? DEMO_PRODUCTS

  // Demo fallback
  const salesByPeriod = report?.by_period ?? DEMO_SALES_DATA
  const summary       = report?.summary   ?? { total_transactions: 487, total_revenue: 38_450_000, avg_transaction: 78_955, total_discount: 2_100_000 }
  const payments      = report?.payment_breakdown ?? DEMO_PAYMENTS
  const voidCount     = report?.void_count ?? 8

  return (
    <div>
      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div className="card mb-6" style={{ padding: '14px 20px' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar size={16} color="var(--text-tertiary)" />
          <span className="text-sm text-secondary">Periode:</span>

          {/* Preset buttons */}
          {PRESETS.map(p => (
            <button key={p.label} className="btn btn-ghost btn-sm"
              onClick={() => applyPreset(p.days)}
              style={{ padding: '4px 10px', fontSize: '.8rem' }}>
              {p.label}
            </button>
          ))}

          <input type="date" className="form-input text-sm" style={{ width: 140 }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-secondary text-sm">—</span>
          <input type="date" className="form-input text-sm" style={{ width: 140 }}
            value={dateTo} onChange={e => setDateTo(e.target.value)} />

          <select className="form-input form-select text-sm" style={{ width: 140 }}
            value={groupBy} onChange={e => setGroupBy(e.target.value as 'day' | 'week' | 'month')}>
            <option value="day">Per Hari</option>
            <option value="week">Per Minggu</option>
            <option value="month">Per Bulan</option>
          </select>

          <button className="btn btn-secondary btn-sm ml-auto">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary KPI Row ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pendapatan',  value: formatRupiah(summary.total_revenue, true), icon: <DollarSign size={18} />, color: 'var(--color-primary-600)' },
          { label: 'Total Transaksi',   value: String(summary.total_transactions),          icon: <ShoppingBag size={18} />, color: 'var(--color-secondary-500)' },
          { label: 'Rata-rata/Transaksi', value: formatRupiah(summary.avg_transaction),     icon: <TrendingUp size={18} />, color: 'var(--color-success-500)' },
          { label: 'Total Diskon',      value: formatRupiah(summary.total_discount, true),   icon: <Users size={18} />, color: 'var(--color-warning-500)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.color } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-secondary">{s.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div className="text-xl font-extrabold text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content' }}>
        {(['sales', 'products', 'payments'] as const).map(tab => (
          <button key={tab} onClick={() => setActive(tab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab ? 'var(--color-primary-600)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeTab === tab ? 600 : 400,
            }}>
            {tab === 'sales' ? 'Penjualan' : tab === 'products' ? 'Produk Terlaris' : 'Metode Bayar'}
          </button>
        ))}
      </div>

      {/* ══ TAB: Sales Chart ════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Area Chart Pendapatan */}
          <div className="card col-span-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-primary">Tren Pendapatan</h3>
                <p className="text-xs text-secondary mt-1">
                  {fmtDate(dateFrom)} — {fmtDate(dateTo)}
                </p>
              </div>
              {voidCount > 0 && (
                <span className="badge badge-error text-xs">{voidCount} void</span>
              )}
            </div>

            {salesLoading ? (
              <div className="skeleton" style={{ height: 250 }} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={salesByPeriod} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-primary-600)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="period" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatRupiah(v, true)} width={65} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'var(--border-default)' }} />
                  <Area type="monotone" dataKey="revenue" name="revenue"
                    stroke="var(--color-primary-600)" strokeWidth={2.5}
                    fill="url(#grad1)" dot={false}
                    activeDot={{ r: 5, fill: 'var(--color-primary-400)' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Transaction Count Bar */}
          <div className="card col-span-4">
            <h3 className="text-base font-semibold text-primary mb-1">Volume Transaksi</h3>
            <p className="text-xs text-secondary mb-4">Jumlah per periode</p>
            {salesLoading ? (
              <div className="skeleton" style={{ height: 250 }} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByPeriod} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="period" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'var(--bg-surface2)' }} />
                  <Bar dataKey="transaction_count" name="count" fill="var(--color-secondary-500)" radius={[3,3,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: Top Products ═══════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Bar chart produk */}
          <div className="card col-span-7">
            <h3 className="text-base font-semibold text-primary mb-4">Pendapatan per Produk</h3>
            {productsLoading ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatRupiah(v, true)} />
                  <YAxis type="category" dataKey="product_name" stroke="var(--text-tertiary)"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip formatter={(v) => [formatRupiah(Number(v), true), 'Pendapatan']}
                    contentStyle={{ background: 'var(--bg-surface3)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }} />
                  <Bar dataKey="total_revenue" radius={[0,3,3,0]}>
                    {topProducts.map((_, i) => (
                      <Cell key={i}
                        fill={`hsl(${258 - i * 18}, ${70 - i * 3}%, ${55 - i * 2}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tabel produk */}
          <div className="card col-span-5" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-base font-semibold text-primary">10 Produk Terlaris</h3>
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produk</th>
                    <th>Terjual</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.product_id}>
                      <td>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: i < 3 ? 'var(--color-primary-600)' : 'var(--bg-surface2)',
                          color: i < 3 ? '#fff' : 'var(--text-tertiary)',
                          fontSize: '.75rem', fontWeight: 700,
                        }}>{i + 1}</span>
                      </td>
                      <td className="text-sm" style={{ maxWidth: 120 }}>
                        <span className="truncate" style={{ display: 'block' }}>{p.product_name}</span>
                      </td>
                      <td className="text-sm text-secondary">{p.total_qty.toLocaleString('id')}</td>
                      <td className="text-sm font-semibold" style={{ color: 'var(--color-primary-400)' }}>
                        {formatRupiah(p.total_revenue, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: Payment Breakdown ══════════════════════════════ */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-3 gap-4">
          {payments.map(p => {
            const pct = summary.total_revenue > 0
              ? ((p.total / summary.total_revenue) * 100).toFixed(1)
              : '0'
            return (
              <div key={p.method} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-info text-xs">{PAYMENT_LABELS[p.method as PaymentMethod]}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary-400)' }}>{pct}%</span>
                </div>
                <div className="text-2xl font-extrabold text-primary mb-1">
                  {formatRupiah(p.total, true)}
                </div>
                <div className="text-xs text-secondary">{p.count} transaksi</div>

                {/* Progress bar */}
                <div style={{ marginTop: 12, height: 4, background: 'var(--bg-surface2)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg,var(--color-primary-600),var(--color-secondary-500))',
                    transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Demo data ────────────────────────────────────────────────────────
const DEMO_SALES_DATA = [
  { period: '06 Jul', revenue: 4_200_000, transaction_count: 58, total_discount: 210_000, total_tax: 0 },
  { period: '07 Jul', revenue: 3_800_000, transaction_count: 51, total_discount: 180_000, total_tax: 0 },
  { period: '08 Jul', revenue: 5_100_000, transaction_count: 73, total_discount: 320_000, total_tax: 0 },
  { period: '09 Jul', revenue: 4_750_000, transaction_count: 66, total_discount: 250_000, total_tax: 0 },
  { period: '10 Jul', revenue: 6_200_000, transaction_count: 89, total_discount: 400_000, total_tax: 0 },
  { period: '11 Jul', revenue: 7_800_000, transaction_count: 112, total_discount: 520_000, total_tax: 0 },
  { period: '12 Jul', revenue: 6_600_000, transaction_count: 38, total_discount: 220_000, total_tax: 0 },
]

const DEMO_PRODUCTS: TopProduct[] = [
  { product_id:'p1', product_name:'Kopi Susu Gula Aren', total_qty:342, total_revenue:9_576_000, transaction_count:298 },
  { product_id:'p2', product_name:'Nasi Goreng Spesial',  total_qty:187, total_revenue:6_545_000, transaction_count:187 },
  { product_id:'p3', product_name:'Teh Susu',             total_qty:265, total_revenue:5_830_000, transaction_count:241 },
  { product_id:'p4', product_name:'Mie Goreng Seafood',   total_qty:124, total_revenue:5_208_000, transaction_count:124 },
  { product_id:'p5', product_name:'Cappuccino',           total_qty:198, total_revenue:4_752_000, transaction_count:182 },
  { product_id:'p6', product_name:'Es Matcha Latte',      total_qty:156, total_revenue:3_900_000, transaction_count:143 },
  { product_id:'p7', product_name:'Roti Bakar Spesial',   total_qty:89,  total_revenue:2_670_000, transaction_count:89 },
  { product_id:'p8', product_name:'Pudding Coklat',        total_qty:143, total_revenue:2_574_000, transaction_count:132 },
]

const DEMO_PAYMENTS = [
  { method: 'cash'     as PaymentMethod, total: 18_450_000, count: 214 },
  { method: 'qris'     as PaymentMethod, total: 12_200_000, count: 148 },
  { method: 'transfer' as PaymentMethod, total:  5_800_000, count:  67 },
  { method: 'voucher'  as PaymentMethod, total:  1_600_000, count:  35 },
  { method: 'points'   as PaymentMethod, total:    400_000, count:  23 },
]
