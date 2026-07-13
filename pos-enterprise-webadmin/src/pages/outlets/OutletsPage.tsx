import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Store, Plus, Edit2, MapPin, Phone, Mail, Percent,
  CheckCircle, XCircle, CreditCard, Search, Building2,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import type { Outlet, PaymentMethod } from '@/types'

// ─── API helpers ────────────────────────────────────────────────────
const outletApi = {
  list:   ()                         => api.get<{ data: Outlet[] }>('/outlets'),
  get:    (id: string)               => api.get<{ data: Outlet }>(`/outlets/${id}`),
  create: (data: Partial<Outlet>)    => api.post('/outlets', data),
  update: (id: string, data: Partial<Outlet>) => api.put(`/outlets/${id}`, data),
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash',     label: 'Tunai',    icon: '💵' },
  { key: 'qris',     label: 'QRIS',     icon: '📱' },
  { key: 'transfer', label: 'Transfer', icon: '🏦' },
  { key: 'voucher',  label: 'Voucher',  icon: '🎟️' },
  { key: 'points',   label: 'Points',   icon: '⭐' },
]

// ─── Outlet Form Modal ───────────────────────────────────────────────
function OutletModal({ outlet, onClose }: { outlet?: Outlet; onClose: () => void }) {
  const isEdit = !!outlet
  const qc = useQueryClient()

  const [form, setForm] = useState({
    name:    outlet?.name    ?? '',
    address: outlet?.address ?? '',
    city:    outlet?.city    ?? '',
    phone:   outlet?.phone   ?? '',
    email:   outlet?.email   ?? '',
    tax_rate: outlet?.tax_rate ?? 0,
    is_active: outlet?.is_active ?? true,
    active_payment_methods: outlet?.active_payment_methods ?? ['cash', 'qris'] as PaymentMethod[],
  })

  const mutation = useMutation(
    () => isEdit ? outletApi.update(outlet!.id, form) : outletApi.create(form),
    {
      onSuccess: () => {
        toast.success(isEdit ? 'Outlet berhasil diperbarui' : 'Outlet berhasil ditambahkan')
        qc.invalidateQueries('outlets')
        onClose()
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg ?? 'Gagal menyimpan outlet')
      },
    }
  )

  function togglePayment(method: PaymentMethod) {
    setForm(f => ({
      ...f,
      active_payment_methods: f.active_payment_methods.includes(method)
        ? f.active_payment_methods.filter(m => m !== method)
        : [...f.active_payment_methods, method],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama outlet wajib diisi'); return }
    mutation.mutate()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-strong)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Store size={20} color="#fff" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Outlet' : 'Tambah Outlet Baru'}</h3>
              <p className="text-xs text-secondary">{isEdit ? outlet?.name : 'Lengkapi informasi outlet'}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">

            {/* Nama */}
            <div className="form-group">
              <label className="form-label">Nama Outlet *</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Cabang Utama Jakarta" />
            </div>

            {/* Alamat */}
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea className="form-input" rows={2} value={form.address ?? ''}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Jl. Contoh No. 123, Jakarta Selatan"
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {/* Kota + Telepon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Kota</label>
                <input className="form-input" value={form.city ?? ''}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="Jakarta" />
              </div>
              <div className="form-group">
                <label className="form-label">No. Telepon</label>
                <input className="form-input" value={form.phone ?? ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812-xxxx-xxxx" />
              </div>
            </div>

            {/* Email + Pajak */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email ?? ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="outlet@perusahaan.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Pajak (%)</label>
                <input className="form-input" type="number" min="0" max="100" step="0.1"
                  value={form.tax_rate}
                  onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })}
                  placeholder="11" />
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="form-group">
              <label className="form-label">Metode Pembayaran Aktif</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PAYMENT_METHODS.map(pm => {
                  const active = form.active_payment_methods.includes(pm.key)
                  return (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => togglePayment(pm.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 20,
                        border: `1px solid ${active ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                        background: active ? 'rgba(var(--color-primary-rgb),0.12)' : 'var(--bg-surface2)',
                        color: active ? 'var(--color-primary-400)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                        transition: 'all .15s',
                      }}
                    >
                      <span>{pm.icon}</span>
                      <span>{pm.label}</span>
                    </button>
                  )
                })}
              </div>
              {form.active_payment_methods.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--color-warning-500)', marginTop: 4 }}>
                  ⚠️ Pilih minimal 1 metode pembayaran
                </p>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-3" style={{
              padding: '12px 14px', background: 'var(--bg-surface2)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
            }}>
              <input type="checkbox" id="outlet-active" checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--color-primary-600)' }} />
              <label htmlFor="outlet-active" style={{ cursor: 'pointer', flex: 1 }}>
                <p className="text-sm font-medium text-primary">Outlet Aktif</p>
                <p className="text-xs text-secondary">Outlet non-aktif tidak bisa digunakan untuk transaksi</p>
              </label>
              <span className={`badge ${form.is_active ? 'badge-success' : 'badge-error'}`}>
                {form.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

          </div>

          <div className="flex gap-2 justify-end mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Outlet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Outlet Card ─────────────────────────────────────────────────────
function OutletCard({ outlet, isActive, onSelect, onEdit }: {
  outlet: Outlet
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  return (
    <div className="card" style={{
      border: isActive
        ? '2px solid var(--color-primary-500)'
        : '1px solid var(--border-default)',
      transition: 'all .2s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Active ribbon */}
      {isActive && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'var(--color-primary-600)',
          color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '3px 10px', borderBottomLeftRadius: 8,
        }}>
          AKTIF
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: isActive
            ? 'linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-500))'
            : 'var(--bg-surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Store size={20} color={isActive ? '#fff' : 'var(--text-tertiary)'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-sm font-semibold text-primary" style={{ marginBottom: 2 }}>{outlet.name}</p>
          <span className={`badge ${outlet.is_active ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '.7rem' }}>
            {outlet.is_active ? '● Aktif' : '● Nonaktif'}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-2 mb-4">
        {outlet.address && (
          <div className="flex items-start gap-2">
            <MapPin size={13} color="var(--text-tertiary)" style={{ marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs text-secondary" style={{ lineHeight: 1.5 }}>
              {outlet.address}{outlet.city ? `, ${outlet.city}` : ''}
            </p>
          </div>
        )}
        {outlet.phone && (
          <div className="flex items-center gap-2">
            <Phone size={13} color="var(--text-tertiary)" />
            <p className="text-xs text-secondary">{outlet.phone}</p>
          </div>
        )}
        {outlet.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} color="var(--text-tertiary)" />
            <p className="text-xs text-secondary">{outlet.email}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Percent size={13} color="var(--text-tertiary)" />
          <p className="text-xs text-secondary">Pajak {outlet.tax_rate}%</p>
        </div>
      </div>

      {/* Payment methods */}
      <div className="flex flex-wrap gap-1 mb-4">
        {PAYMENT_METHODS.map(pm => {
          const enabled = outlet.active_payment_methods?.includes(pm.key)
          return (
            <span key={pm.key} style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 10,
              background: enabled ? 'rgba(var(--color-primary-rgb),0.1)' : 'var(--bg-surface2)',
              color: enabled ? 'var(--color-primary-400)' : 'var(--text-tertiary)',
              border: `1px solid ${enabled ? 'var(--color-primary-500)' : 'transparent'}`,
              opacity: enabled ? 1 : 0.5,
            }}>
              {pm.icon} {pm.label}
            </span>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isActive && outlet.is_active && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onSelect}>
            <CheckCircle size={13} /> Gunakan Outlet Ini
          </button>
        )}
        {isActive && (
          <div className="flex items-center gap-1" style={{ flex: 1, color: 'var(--color-primary-400)', fontSize: 12, fontWeight: 600 }}>
            <CheckCircle size={13} /> Outlet sedang digunakan
          </div>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit outlet">
          <Edit2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// OUTLETS PAGE
// ═══════════════════════════════════════════════════════════════════
export function OutletsPage() {
  const { currentOutletId, setOutlet, user } = useAuthStore()
  const [search, setSearch]   = useState('')
  const [editTarget, setEdit] = useState<Outlet | undefined | null>(undefined) // null = tambah baru
  const [filter, setFilter]   = useState<'all' | 'active' | 'inactive'>('all')

  const { data, isLoading, error } = useQuery(
    'outlets',
    () => outletApi.list().then(r => r.data.data),
    { staleTime: 60_000 },
  )

  // Fallback ke outlet dari auth store jika API belum tersedia
  const allOutlets: Outlet[] = (data && data.length > 0)
    ? data
    : (user?.outlets ?? []).map(o => ({
        id: o.id,
        company_id: '',
        name: o.name,
        address: null,
        city: null,
        phone: null,
        email: null,
        tax_rate: 0,
        is_active: true,
        active_payment_methods: ['cash', 'qris'] as PaymentMethod[],
        created_at: '',
        updated_at: '',
      }))

  const filtered = allOutlets.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.city ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'active' ? o.is_active : !o.is_active)
    return matchSearch && matchFilter
  })

  const activeCount   = allOutlets.filter(o => o.is_active).length
  const inactiveCount = allOutlets.filter(o => !o.is_active).length

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Building2 size={22} /> Manajemen Outlet
          </h2>
          <p className="text-sm text-secondary mt-1">
            {allOutlets.length} outlet terdaftar · {activeCount} aktif · {inactiveCount} nonaktif
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit(null)}>
          <Plus size={15} /> Tambah Outlet
        </button>
      </div>

      {/* ── Outlet Aktif Banner ──────────────────────────────────── */}
      {currentOutletId && (
        <div className="card mb-6 flex items-center gap-4" style={{
          padding: '14px 20px',
          background: 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.08), transparent)',
          border: '1px solid var(--color-primary-500)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0,
            background: 'linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Store size={18} color="#fff" />
          </div>
          <div>
            <p className="text-xs text-secondary">Outlet yang sedang aktif digunakan</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-primary-400)' }}>
              {allOutlets.find(o => o.id === currentOutletId)?.name ?? currentOutletId}
            </p>
          </div>
          <div className="ml-auto">
            <span className="badge badge-success">● Aktif</span>
          </div>
        </div>
      )}

      {/* ── Search + Filter ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="topbar-search" style={{ minWidth: 280 }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input placeholder="Cari nama outlet, kota..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'Semua' : f === 'active' ? '● Aktif' : '○ Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ height: 220, background: 'var(--bg-surface2)', opacity: .5 }} />
          ))}
        </div>
      ) : error ? (
        /* Fallback jika endpoint /outlets tidak ada — tampilkan dari auth store */
        allOutlets.length > 0 ? (
          <div>
            <div className="card mb-4 flex items-center gap-3" style={{
              padding: '10px 16px',
              background: 'rgba(245,158,11,.08)', borderColor: 'rgba(245,158,11,.3)',
            }}>
              <XCircle size={15} color="var(--color-warning-500)" />
              <p className="text-xs" style={{ color: 'var(--color-warning-500)' }}>
                Endpoint /outlets belum tersedia di server. Menampilkan outlet dari sesi login.
                Fitur tambah/edit outlet memerlukan endpoint API.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
              {filtered.map(o => (
                <OutletCard key={o.id} outlet={o}
                  isActive={o.id === currentOutletId}
                  onSelect={() => { setOutlet(o.id); toast.success(`Beralih ke ${o.name}`) }}
                  onEdit={() => setEdit(o)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center" style={{ padding: 64, gap: 12 }}>
            <Store size={40} color="var(--text-tertiary)" />
            <p className="text-lg font-semibold text-primary">Belum ada outlet</p>
            <p className="text-sm text-secondary">Tambahkan outlet pertama untuk memulai</p>
            <button className="btn btn-primary mt-2" onClick={() => setEdit(null)}>
              <Plus size={15} /> Tambah Outlet
            </button>
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center" style={{ padding: 48, gap: 8 }}>
          <Search size={32} color="var(--text-tertiary)" />
          <p className="text-sm font-medium text-primary">Tidak ada hasil</p>
          <p className="text-xs text-secondary">Coba ubah kata kunci pencarian</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {filtered.map(o => (
            <OutletCard key={o.id} outlet={o}
              isActive={o.id === currentOutletId}
              onSelect={() => { setOutlet(o.id); toast.success(`Beralih ke outlet ${o.name}`) }}
              onEdit={() => setEdit(o)}
            />
          ))}
        </div>
      )}

      {/* ── Panduan Penggunaan ───────────────────────────────────── */}
      <div className="card mt-6" style={{
        padding: '16px 20px',
        background: 'var(--bg-surface2)',
        border: '1px solid var(--border-default)',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={15} color="var(--text-secondary)" />
          <p className="text-sm font-semibold text-primary">Cara Menggunakan Outlet</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {[
            { icon: '1️⃣', text: 'Pilih outlet yang ingin digunakan dengan klik "Gunakan Outlet Ini"' },
            { icon: '2️⃣', text: 'Semua transaksi dan produk akan terkait dengan outlet yang aktif' },
            { icon: '3️⃣', text: 'Edit outlet untuk mengubah info, pajak, atau metode pembayaran' },
            { icon: '4️⃣', text: 'Outlet nonaktif tidak bisa digunakan untuk transaksi kasir' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <p className="text-xs text-secondary" style={{ lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {editTarget !== undefined && (
        <OutletModal
          outlet={editTarget ?? undefined}
          onClose={() => setEdit(undefined)}
        />
      )}
    </div>
  )
}
