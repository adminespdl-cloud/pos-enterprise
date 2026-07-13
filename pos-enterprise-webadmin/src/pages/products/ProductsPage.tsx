import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle, MoreVertical } from 'lucide-react'
import { productApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { formatRupiah, PRODUCT_STATUS_CONFIG } from '@/utils/formatters'
import type { Product } from '@/types'

// ─── Product Form Modal ─────────────────────────────────────────────
function ProductModal({ product, onClose, onSaved }: {
  product?: Product; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!product
  const { currentOutletId, user } = useAuthStore()

  const [form, setForm] = useState({
    name:          product?.name          ?? '',
    sku:           product?.sku           ?? '',
    barcode:       product?.barcode       ?? '',
    base_price:    product?.base_price    ?? 0,
    cost_price:    product?.cost_price    ?? 0,
    unit:          product?.unit          ?? 'pcs',
    is_track_stock:product?.is_track_stock ?? true,
    status:        product?.status        ?? 'active',
    category_id:   product?.category?.id  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Daftar outlet milik user (untuk selector)
  const outlets = user?.outlets ?? []
  const { setOutlet } = useAuthStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nama produk wajib diisi'); return }
    if (!currentOutletId) { setError('Pilih outlet terlebih dahulu sebelum menyimpan produk'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) await productApi.update(product!.id, form)
      else        await productApi.create(form)
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan produk. Periksa koneksi dan coba lagi.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Produk' : 'Tambah Produk'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* ── Outlet Selector / Warning ─────────────────────────── */}
        {outlets.length > 1 ? (
          <div className="form-group mb-4">
            <label className="form-label">Outlet *</label>
            <select
              className="form-input form-select"
              value={currentOutletId ?? ''}
              onChange={e => setOutlet(e.target.value)}
            >
              <option value="" disabled>— Pilih Outlet —</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        ) : !currentOutletId && outlets.length === 0 ? (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <p style={{ color: 'var(--color-error-500)', fontSize: 13, fontWeight: 600 }}>Outlet belum dikonfigurasi</p>
              <p style={{ color: 'var(--color-error-500)', fontSize: 12, opacity: 0.8 }}>
                Akun Anda belum memiliki outlet. Hubungi administrator.
              </p>
            </div>
          </div>
        ) : currentOutletId ? (
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 8, padding: '8px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>🏪</span>
            <p style={{ color: 'var(--color-success-600)', fontSize: 12 }}>
              Menyimpan ke outlet: <strong>{outlets.find(o => o.id === currentOutletId)?.name ?? currentOutletId}</strong>
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Nama Produk *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Contoh: Kopi Susu Gula Aren" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input className="form-input" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SKU-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Barcode</label>
                <input className="form-input" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="12345678" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Harga Jual (Rp) *</label>
                <input className="form-input" type="number" min="0" value={form.base_price}
                  onChange={e => setForm({...form, base_price: Number(e.target.value)})} placeholder="25000" />
              </div>
              <div className="form-group">
                <label className="form-label">Harga Modal (Rp)</label>
                <input className="form-input" type="number" min="0" value={form.cost_price}
                  onChange={e => setForm({...form, cost_price: Number(e.target.value)})} placeholder="15000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Satuan</label>
                <select className="form-input form-select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                  {['pcs','kg','gram','liter','ml','dus','lusin','pak'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value as 'active' | 'inactive'})}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="track-stock" checked={form.is_track_stock}
                onChange={e => setForm({...form, is_track_stock: e.target.checked})}
                style={{ width: 16, height: 16, accentColor: 'var(--color-primary-600)' }} />
              <label htmlFor="track-stock" className="text-sm text-secondary" style={{ cursor: 'pointer' }}>
                Lacak stok produk ini
              </label>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>❌</span>
                <p style={{ color: 'var(--color-error-500)', fontSize: 13 }}>{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !currentOutletId}
              title={!currentOutletId ? 'Pilih outlet terlebih dahulu' : ''}
            >
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCTS PAGE
// ═══════════════════════════════════════════════════════════════════
export function ProductsPage() {
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [modalProduct, setModal]  = useState<Product | null | undefined>(undefined) // undefined = closed
  const [viewMode, setViewMode]   = useState<'table' | 'grid'>('table')

  const { data, isLoading, refetch } = useQuery(
    ['products', search, page],
    () => productApi.list({ search: search || undefined, per_page: 20, page }).then(r => r.data),
    { keepPreviousData: true, staleTime: 30_000 },
  )

  const products: Product[] = data?.data?.data ?? DEMO_PRODUCTS
  const total = data?.data?.total ?? DEMO_PRODUCTS.length

  const { currentOutletId } = useAuthStore()

  function handleDelete(id: string) {
    if (!currentOutletId) {
      alert('⚠️ Pilih outlet terlebih dahulu sebelum menghapus produk.')
      return
    }
    if (!confirm('Hapus produk ini? Tindakan ini tidak bisa dibatalkan.')) return
    productApi.delete(id)
      .then(() => { refetch() })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        alert(`❌ Gagal menghapus: ${msg ?? 'Terjadi kesalahan. Coba lagi.'}`)
      })
  }

  return (
    <div>
      {/* ── Header + Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="topbar-search" style={{ minWidth: 260 }}>
            <Search size={15} color="var(--text-tertiary)" />
            <input placeholder="Nama, barcode, SKU..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <span className="text-xs text-secondary">{total} produk</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}>
            {viewMode === 'table' ? '⊞ Grid' : '☰ Tabel'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
            <Plus size={15} /> Tambah Produk
          </button>
        </div>
      </div>

      {/* ── Stock Alert banner ─────────────────────────────────── */}
      <div className="card mb-4 flex items-center gap-3" style={{ padding: '12px 16px', background: 'rgba(245,158,11,.08)', borderColor: 'rgba(245,158,11,.3)' }}>
        <AlertTriangle size={16} color="var(--color-warning-500)" />
        <p className="text-sm" style={{ color: 'var(--color-warning-500)' }}>
          <strong>5 produk</strong> memiliki stok di bawah minimum.
        </p>
        <button className="btn btn-ghost btn-sm ml-auto" style={{ color: 'var(--color-warning-500)' }}>Lihat →</button>
      </div>

      {/* ── Table View ─────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="card p-0">
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 'var(--radius-md)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>SKU / Barcode</th>
                  <th>Harga Jual</th>
                  <th>Harga Modal</th>
                  <th>Margin</th>
                  <th>Stok</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>Memuat...</td></tr>
                ) : products.map(p => {
                  const sc = PRODUCT_STATUS_CONFIG[p.status]
                  const margin = p.cost_price > 0
                    ? (((p.base_price - p.cost_price) / p.cost_price) * 100).toFixed(1)
                    : null
                  const isLow  = p.is_track_stock && (p.stock ?? 999) < 5

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Package size={16} color="var(--text-tertiary)" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{p.name}</p>
                            {p.category && <p className="text-xs text-secondary">{p.category.name}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs font-mono text-secondary">{p.sku ?? '—'}</p>
                        {p.barcode && <p className="text-xs text-tertiary">{p.barcode}</p>}
                      </td>
                      <td className="text-sm font-semibold">{formatRupiah(p.base_price)}</td>
                      <td className="text-sm text-secondary">{p.cost_price ? formatRupiah(p.cost_price) : '—'}</td>
                      <td>
                        {margin ? (
                          <span className={`badge ${Number(margin) >= 30 ? 'badge-success' : Number(margin) >= 10 ? 'badge-warning' : 'badge-error'}`}>
                            {margin}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {p.is_track_stock ? (
                          <span className={`badge ${isLow ? 'badge-error' : 'badge-success'}`}>
                            {isLow && <AlertTriangle size={10} />}
                            {p.stock ?? 0} {p.unit}
                          </span>
                        ) : <span className="text-xs text-secondary">Tidak dilacak</span>}
                      </td>
                      <td><span className={`badge ${sc.badge}`} style={{ fontSize: '.7rem' }}>{sc.label}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(p)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error-500)' }}
                            onClick={() => handleDelete(p.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Grid View ──────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: 16 }}>
              <div style={{
                height: 80, background: 'var(--bg-surface2)',
                borderRadius: 'var(--radius-sm)', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Package size={28} color="var(--text-tertiary)" />
              </div>
              <p className="text-sm font-semibold text-primary truncate">{p.name}</p>
              {p.category && <p className="text-xs text-secondary mt-1">{p.category.name}</p>}
              <p className="text-base font-bold mt-2" style={{ color: 'var(--color-primary-400)' }}>
                {formatRupiah(p.base_price)}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className={`badge ${PRODUCT_STATUS_CONFIG[p.status].badge}`} style={{ fontSize: '.7rem' }}>
                  {PRODUCT_STATUS_CONFIG[p.status].label}
                </span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(p)}><Edit2 size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-error-500)' }}
                    onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct ?? undefined}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); refetch() }}
        />
      )}
    </div>
  )
}

// Demo data
const DEMO_PRODUCTS: Product[] = [
  { id:'p1', name:'Kopi Susu Gula Aren', sku:'KSG-001', barcode:'8991234', base_price:28_000, cost_price:12_000, unit:'cup', status:'active', is_track_stock:true, has_variants:false, image_url:null, category:{ id:'c1', name:'Minuman', parent_id:null, sort_order:1, is_active:true }, variants:[], updated_at:'2026-07-12T00:00:00Z', stock: 45 },
  { id:'p2', name:'Nasi Goreng Spesial', sku:'NGS-001', barcode:null, base_price:35_000, cost_price:15_000, unit:'porsi', status:'active', is_track_stock:false, has_variants:false, image_url:null, category:{ id:'c2', name:'Makanan', parent_id:null, sort_order:2, is_active:true }, variants:[], updated_at:'2026-07-12T00:00:00Z' },
  { id:'p3', name:'Teh Susu', sku:'TS-001', barcode:'8991235', base_price:22_000, cost_price:8_000, unit:'cup', status:'active', is_track_stock:true, has_variants:false, image_url:null, category:{ id:'c1', name:'Minuman', parent_id:null, sort_order:1, is_active:true }, variants:[], updated_at:'2026-07-12T00:00:00Z', stock: 3 },
  { id:'p4', name:'Mie Goreng Seafood', sku:'MGS-001', barcode:null, base_price:42_000, cost_price:20_000, unit:'porsi', status:'active', is_track_stock:false, has_variants:true, image_url:null, category:{ id:'c2', name:'Makanan', parent_id:null, sort_order:2, is_active:true }, variants:[], updated_at:'2026-07-12T00:00:00Z' },
  { id:'p5', name:'Pudding Coklat', sku:'PC-001', barcode:'8991236', base_price:18_000, cost_price:7_000, unit:'cup', status:'inactive', is_track_stock:true, has_variants:false, image_url:null, category:{ id:'c3', name:'Dessert', parent_id:null, sort_order:3, is_active:true }, variants:[], updated_at:'2026-07-12T00:00:00Z', stock: 0 },
]
