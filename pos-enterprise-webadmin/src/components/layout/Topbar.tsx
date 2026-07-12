import { Search, Bell, RefreshCw, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

interface TopbarProps {
  title:    string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, currentOutletId, setOutlet } = useAuthStore()
  const [search, setSearch] = useState('')

  const outlets = user?.outlets ?? []
  const currentOutlet = outlets.find(o => o.id === currentOutletId) ?? outlets[0]

  return (
    <header className="topbar">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Global search */}
        <div className="topbar-search">
          <Search size={16} color="var(--text-tertiary)" />
          <input
            placeholder="Cari transaksi, produk, member..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Outlet switcher (jika multi-outlet) */}
        {outlets.length > 1 && (
          <div className="relative">
            <select
              className="form-input form-select text-sm"
              value={currentOutletId ?? ''}
              onChange={e => setOutlet(e.target.value)}
              style={{ minWidth: 160, paddingRight: 36 }}
            >
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
        {outlets.length === 1 && currentOutlet && (
          <div className="flex items-center gap-2 px-4 py-2 card" style={{ padding: '6px 12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success-500)' }} />
            <span className="text-sm font-medium text-primary">{currentOutlet.name}</span>
          </div>
        )}

        {/* Refresh */}
        <button className="btn btn-ghost btn-icon" title="Refresh data">
          <RefreshCw size={16} />
        </button>

        {/* Notif */}
        <div className="relative">
          <button className="btn btn-ghost btn-icon">
            <Bell size={16} />
          </button>
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--color-error-500)',
            border: '2px solid var(--bg-elevated)',
          }} />
        </div>
      </div>
    </header>
  )
}
