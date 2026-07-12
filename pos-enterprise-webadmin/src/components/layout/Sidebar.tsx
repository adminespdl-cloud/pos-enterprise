import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart2,
  Store, Settings, LogOut, ChevronLeft, ChevronRight,
  CreditCard, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/api'
import { useState } from 'react'

const NAV = [
  {
    section: 'Utama',
    items: [
      { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/transactions',icon: ShoppingCart,    label: 'Transaksi' },
      { to: '/shifts',      icon: CreditCard,      label: 'Shift' },
    ],
  },
  {
    section: 'Katalog',
    items: [
      { to: '/products', icon: Package, label: 'Produk' },
      { to: '/members',  icon: Users,   label: 'Member' },
    ],
  },
  {
    section: 'Manajemen',
    items: [
      { to: '/outlets', icon: Store,       label: 'Outlet' },
      { to: '/reports', icon: BarChart2,   label: 'Laporan' },
      { to: '/alerts',  icon: AlertTriangle,label: 'Peringatan', badge: '3' },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { to: '/settings', icon: Settings, label: 'Pengaturan' },
    ],
  },
]

interface SidebarProps { collapsed: boolean; onToggle: () => void }

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar" style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">P</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div className="text-sm font-semibold text-primary" style={{ whiteSpace: 'nowrap' }}>POS Enterprise</div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Admin Panel</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div className="sidebar-section-label">{group.section}</div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="badge-count">{item.badge}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="flex items-center gap-2 mb-4" style={{ padding: '8px 4px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div className="text-sm font-medium text-primary truncate">{user.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</div>
            </div>
          </div>
        )}

        <button
          className="sidebar-item w-full"
          onClick={handleLogout}
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Keluar</span>}
        </button>

        {/* Collapse toggle */}
        <button
          className="sidebar-item w-full mt-2"
          onClick={onToggle}
          title={collapsed ? 'Perluas' : 'Ciutkan'}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Ciutkan</span></>}
        </button>
      </div>
    </aside>
  )
}
