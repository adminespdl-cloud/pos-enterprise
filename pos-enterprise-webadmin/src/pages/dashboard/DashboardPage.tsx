import { useQuery } from 'react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart, Users,
  AlertTriangle, DollarSign, Package, Zap,
} from 'lucide-react'
import { reportApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { formatRupiah, fmtGrowth, fmtDate, PAYMENT_LABELS } from '@/utils/formatters'
import type { DashboardData } from '@/types'

// ── Stat Card ───────────────────────────────────────────────────────
interface StatCardProps {
  label: string; value: string; sub?: string
  growth?: number; icon: React.ReactNode; accentColor: string
  loading?: boolean
}

function StatCard({ label, value, sub, growth, icon, accentColor, loading }: StatCardProps) {
  if (loading) return <div className="stat-card skeleton" style={{ height: 120 }} />

  return (
    <div className="stat-card" style={{ '--accent': accentColor } as React.CSSProperties}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{
          width: 38, height: 38, borderRadius: 'var(--radius-sm)',
          background: accentColor + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor,
        }}>{icon}</div>
      </div>

      <div className="text-2xl font-extrabold text-primary" style={{ letterSpacing: '-0.02em' }}>{value}</div>

      {(growth !== undefined || sub) && (
        <div className="flex items-center gap-2 mt-2">
          {growth !== undefined && (
            <span className="flex items-center gap-1 text-xs font-medium"
              style={{ color: growth >= 0 ? 'var(--color-success-500)' : 'var(--color-error-500)' }}>
              {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {fmtGrowth(growth)}
            </span>
          )}
          {sub && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ── Custom Tooltip ──────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="text-xs text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-semibold text-primary">
          {p.name === 'revenue' ? formatRupiah(p.value, true) : `${p.value} transaksi`}
        </p>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { currentOutletId } = useAuthStore()

  const { data, isLoading } = useQuery<{ data: DashboardData }>(
    ['dashboard', currentOutletId],
    () => reportApi.dashboard(currentOutletId ?? undefined).then(r => r.data),
    { refetchInterval: 60_000, staleTime: 30_000 },
  )

  const stats = data?.data

  // Demo weekly data jika belum ada API
  const weeklyData = stats?.weekly_chart ?? [
    { date: 'Sen', revenue: 3_200_000, count: 47 },
    { date: 'Sel', revenue: 2_850_000, count: 39 },
    { date: 'Rab', revenue: 4_100_000, count: 61 },
    { date: 'Kam', revenue: 3_700_000, count: 52 },
    { date: 'Jum', revenue: 5_200_000, count: 74 },
    { date: 'Sab', revenue: 6_800_000, count: 98 },
    { date: 'Min', revenue: 4_500_000, count: 63 },
  ]

  const paymentData = [
    { name: 'Tunai',    value: 48, color: '#10B981' },
    { name: 'QRIS',     value: 31, color: '#06B6D4' },
    { name: 'Transfer', value: 14, color: '#8B5CF6' },
    { name: 'Voucher',  value:  7, color: '#F59E0B' },
  ]

  return (
    <div>
      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatRupiah(stats?.today_revenue ?? 4_827_500, true)}
          growth={stats?.revenue_growth ?? 12.4}
          sub="vs kemarin"
          icon={<DollarSign size={18} />}
          accentColor="var(--color-primary-600)"
          loading={isLoading}
        />
        <StatCard
          label="Total Transaksi"
          value={String(stats?.today_transactions ?? 73)}
          growth={8.2}
          sub="vs kemarin"
          icon={<ShoppingCart size={18} />}
          accentColor="var(--color-secondary-500)"
          loading={isLoading}
        />
        <StatCard
          label="Member Baru"
          value={String(stats?.new_members_today ?? 12)}
          sub="hari ini"
          icon={<Users size={18} />}
          accentColor="var(--color-success-500)"
          loading={isLoading}
        />
        <StatCard
          label="Stok Kritis"
          value={String(stats?.critical_stock ?? 5)}
          sub="produk perlu restok"
          icon={<AlertTriangle size={18} />}
          accentColor="var(--color-warning-500)"
          loading={isLoading}
        />
      </div>

      {/* ── Charts Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4 mb-6">

        {/* Revenue Chart (7/12) */}
        <div className="card col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-primary">Tren Pendapatan</h3>
              <p className="text-xs text-secondary mt-1">7 hari terakhir</p>
            </div>
            <div className="flex gap-2">
              {['7H', '30H', '3B'].map(p => (
                <button key={p} className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 10px', fontSize: '.75rem' }}>{p}</button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-primary-600)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary-600)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatRupiah(v, true)} width={60} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-default)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="revenue" name="revenue"
                stroke="var(--color-primary-600)" strokeWidth={2.5}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: 'var(--color-primary-400)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Breakdown (5/12) */}
        <div className="card col-span-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-primary">Metode Pembayaran</h3>
            <p className="text-xs text-secondary mt-1">Distribusi hari ini</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={50} outerRadius={75} paddingAngle={3}>
                {paymentData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{
                background: 'var(--bg-surface3)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)', fontSize: 12,
              }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>
              )} />
            </PieChart>
          </ResponsiveContainer>

          {/* Persentase list */}
          <div style={{ marginTop: 4 }}>
            {paymentData.map(p => (
              <div key={p.name} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span className="text-xs text-secondary">{p.name}</span>
                </div>
                <span className="text-xs font-semibold text-primary">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Transaction Volume Bar + Quick Stats ───────────────── */}
      <div className="grid grid-cols-12 gap-4 mb-6">

        {/* Bar Chart transaksi (8/12) */}
        <div className="card col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-primary">Volume Transaksi</h3>
              <p className="text-xs text-secondary mt-1">Jumlah transaksi per hari</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-surface2)' }} />
              <Bar dataKey="count" name="count" fill="var(--color-secondary-500)"
                radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats (4/12) */}
        <div className="col-span-4 flex flex-col gap-4">
          <QuickStat icon={<Zap size={16} />} label="Rata-rata per Transaksi"
            value={formatRupiah(Math.floor((stats?.today_revenue ?? 4_827_500) / (stats?.today_transactions ?? 73)))}
            color="var(--color-primary-400)" />
          <QuickStat icon={<Package size={16} />} label="Void Hari Ini"
            value={String(stats?.today_void ?? 2)}
            sub="transaksi dibatalkan"
            color="var(--color-error-500)" />
          <QuickStat icon={<Users size={16} />} label="Transaksi dengan Member"
            value="38%"
            sub="dari total transaksi"
            color="var(--color-success-500)" />
        </div>
      </div>

      {/* ── Recent Transactions Table ───────────────────────────── */}
      <RecentTransactionsTable />
    </div>
  )
}

// ── Quick Stat mini card ────────────────────────────────────────────
function QuickStat({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="card flex items-center gap-3" style={{ padding: '16px' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 'var(--radius-sm)',
        background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div className="text-xs text-secondary">{label}</div>
        <div className="text-lg font-bold text-primary">{value}</div>
        {sub && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Recent Transactions mini table ──────────────────────────────────
function RecentTransactionsTable() {
  // Demo data
  const rows = [
    { no: 'TRX-CNTR-20260712-0087', time: '13:42', cashier: 'Andi P.', items: 5, total: 127_500, method: 'QRIS', status: 'completed' },
    { no: 'TRX-CNTR-20260712-0086', time: '13:35', cashier: 'Andi P.', items: 2, total: 45_000,  method: 'Tunai', status: 'completed' },
    { no: 'TRX-CNTR-20260712-0085', time: '13:21', cashier: 'Budi S.', items: 8, total: 312_000, method: 'Transfer', status: 'completed' },
    { no: 'TRX-CNTR-20260712-0084', time: '13:05', cashier: 'Budi S.', items: 1, total: 25_000,  method: 'Tunai', status: 'voided' },
    { no: 'TRX-CNTR-20260712-0083', time: '12:58', cashier: 'Andi P.', items: 3, total: 89_000,  method: 'QRIS', status: 'completed' },
  ]

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-primary">Transaksi Terbaru</h3>
          <p className="text-xs text-secondary mt-1">5 transaksi terakhir hari ini</p>
        </div>
        <a href="/transactions" className="btn btn-ghost btn-sm">Lihat semua →</a>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>No. Transaksi</th>
              <th>Waktu</th>
              <th>Kasir</th>
              <th>Item</th>
              <th>Total</th>
              <th>Metode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.no}>
                <td>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-primary-400)' }}>
                    {r.no.slice(-8)}
                  </span>
                </td>
                <td className="text-sm text-secondary">{r.time}</td>
                <td className="text-sm">{r.cashier}</td>
                <td className="text-sm text-secondary">{r.items} item</td>
                <td className="text-sm font-semibold">{formatRupiah(r.total)}</td>
                <td>
                  <span className="badge badge-info" style={{ fontSize: '.7rem' }}>{r.method}</span>
                </td>
                <td>
                  <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '.7rem' }}>
                    {r.status === 'completed' ? 'Selesai' : 'Void'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
