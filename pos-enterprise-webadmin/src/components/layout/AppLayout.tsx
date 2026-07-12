import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useLocation } from 'react-router-dom'

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/':             { title: 'Dashboard',    subtitle: 'Ringkasan performa bisnis hari ini' },
  '/transactions': { title: 'Transaksi',    subtitle: 'Riwayat dan manajemen transaksi' },
  '/shifts':       { title: 'Shift',        subtitle: 'Riwayat shift kasir' },
  '/products':     { title: 'Produk',       subtitle: 'Katalog produk dan manajemen stok' },
  '/members':      { title: 'Member',       subtitle: 'Data pelanggan dan program loyalitas' },
  '/outlets':      { title: 'Outlet',       subtitle: 'Manajemen cabang' },
  '/reports':      { title: 'Laporan',      subtitle: 'Analitik penjualan dan performa' },
  '/alerts':       { title: 'Peringatan',   subtitle: 'Stok kritis dan notifikasi penting' },
  '/settings':     { title: 'Pengaturan',   subtitle: 'Konfigurasi sistem' },
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const meta = PAGE_META[location.pathname] ?? { title: 'POS Enterprise' }

  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <Topbar title={meta.title} subtitle={meta.subtitle} />
      <main className="page-content fade-in">
        <Outlet />
      </main>
    </div>
  )
}
