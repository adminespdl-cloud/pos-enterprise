import { useState } from 'react'
import { useQuery } from 'react-query'
import { Search, Plus, Star, Phone, Mail, Users, TrendingUp } from 'lucide-react'
import { memberApi } from '@/services/api'
import { formatRupiah, fmtDate, TIER_CONFIG } from '@/utils/formatters'
import type { Member, MemberTier } from '@/types'

function TierBadge({ tier }: { tier: MemberTier }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <span className="badge flex items-center gap-1"
      style={{ background: cfg.bg, color: cfg.color, fontSize: '.7rem' }}>
      <Star size={10} fill={cfg.color} stroke="none" />
      {cfg.label}
    </span>
  )
}

function MemberModal({ member, onClose, onSaved }: {
  member?: Member; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!member
  const [form, setForm] = useState({
    name:       member?.name       ?? '',
    phone:      member?.phone      ?? '',
    email:      member?.email      ?? '',
    birth_date: member?.birth_date ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nama wajib diisi'); return }
    setSaving(true)
    try {
      if (isEdit) await memberApi.update(member!.id, form)
      else        await memberApi.create(form)
      onSaved()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div className="card" style={{ width: 440, border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-primary">{isEdit ? 'Edit Member' : 'Tambah Member'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Nama *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama lengkap" />
            </div>
            <div className="form-group">
              <label className="form-label">No. Telepon</label>
              <input className="form-input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@contoh.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Lahir</label>
              <input className="form-input" type="date" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})} />
            </div>
            {error && <p className="form-error">{error}</p>}
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MEMBERS PAGE
// ═══════════════════════════════════════════════════════════════════
export function MembersPage() {
  const [search,  setSearch]  = useState('')
  const [tier,    setTier]    = useState<MemberTier | ''>('')
  const [page,    setPage]    = useState(1)
  const [modal,   setModal]   = useState<Member | null | undefined>(undefined)
  const [detail,  setDetail]  = useState<Member | null>(null)

  const { data, isLoading, refetch } = useQuery(
    ['members', search, tier, page],
    () => memberApi.list({ search: search || undefined, tier: tier || undefined, per_page: 20, page }).then(r => r.data),
    { keepPreviousData: true, staleTime: 30_000 },
  )

  const members: Member[] = data?.data?.data ?? DEMO_MEMBERS
  const total = data?.data?.total ?? DEMO_MEMBERS.length

  const tierStats = (['bronze','silver','gold','platinum'] as MemberTier[]).map(t => ({
    tier: t,
    count: members.filter(m => m.tier === t).length,
    ...TIER_CONFIG[t],
  }))

  return (
    <div>
      {/* ── Tier Overview ───────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {tierStats.map(ts => (
          <div key={ts.tier} className="stat-card" style={{ '--accent': ts.color } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-3">
              <TierBadge tier={ts.tier as MemberTier} />
              <Star size={18} color={ts.color} fill={ts.color} />
            </div>
            <div className="text-2xl font-bold text-primary">{ts.count}</div>
            <div className="text-xs text-secondary mt-1">member {ts.label}</div>
          </div>
        ))}
      </div>

      {/* ── Summary Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-3" style={{ padding: '14px 20px' }}>
          <div style={{ width:38,height:38,borderRadius:'var(--radius-sm)',background:'rgba(124,58,237,.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Users size={18} color="var(--color-primary-400)" />
          </div>
          <div>
            <div className="text-xs text-secondary">Total Member</div>
            <div className="text-xl font-bold text-primary">{total}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3" style={{ padding: '14px 20px' }}>
          <div style={{ width:38,height:38,borderRadius:'var(--radius-sm)',background:'rgba(16,185,129,.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Star size={18} color="var(--color-success-500)" />
          </div>
          <div>
            <div className="text-xs text-secondary">Total Poin Aktif</div>
            <div className="text-xl font-bold text-primary">
              {members.reduce((s, m) => s + m.points_balance, 0).toLocaleString('id')}
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-3" style={{ padding: '14px 20px' }}>
          <div style={{ width:38,height:38,borderRadius:'var(--radius-sm)',background:'rgba(6,182,212,.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <TrendingUp size={18} color="var(--color-secondary-500)" />
          </div>
          <div>
            <div className="text-xs text-secondary">Rata-rata Belanja</div>
            <div className="text-xl font-bold text-primary">
              {formatRupiah(members.length > 0 ? Math.floor(members.reduce((s,m) => s+m.total_transaction_amount,0)/members.length) : 0, true)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters + Add ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="topbar-search" style={{ minWidth: 240 }}>
            <Search size={15} color="var(--text-tertiary)" />
            <input placeholder="Nama, no. HP, email..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="form-input form-select text-sm" style={{ width: 140 }}
            value={tier} onChange={e => { setTier(e.target.value as MemberTier | ''); setPage(1) }}>
            <option value="">Semua Tier</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
          <Plus size={15} /> Tambah Member
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="card p-0">
        <div className="table-wrapper" style={{ border:'none', borderRadius:'var(--radius-md)' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Kontak</th>
                <th>Tier</th>
                <th>Poin</th>
                <th>Total Transaksi</th>
                <th>Total Belanja</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--text-tertiary)' }}>Memuat...</td></tr>
              ) : members.map(m => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(m)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width:36, height:36, borderRadius:'50%',
                        background: 'linear-gradient(135deg,var(--color-primary-700),var(--color-secondary-600))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'.875rem', fontWeight:700, color:'#fff', flexShrink:0,
                      }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{m.name}</p>
                        {m.email && <p className="text-xs text-secondary">{m.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {m.phone && (
                      <div className="flex items-center gap-1 text-sm text-secondary">
                        <Phone size={12} /> {m.phone}
                      </div>
                    )}
                  </td>
                  <td><TierBadge tier={m.tier} /></td>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize:'.75rem' }}>
                      <Star size={10} /> {m.points_balance.toLocaleString('id')}
                    </span>
                  </td>
                  <td className="text-sm text-secondary">{m.total_transaction_count}x</td>
                  <td className="text-sm font-semibold">{formatRupiah(m.total_transaction_amount, true)}</td>
                  <td className="text-sm text-secondary">{fmtDate(m.created_at)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal(m)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div style={{ position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div className="card" style={{ width:420, border:'1px solid var(--border-strong)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Detail Member</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div style={{ width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-500))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',fontWeight:800,color:'#fff' }}>
                {detail.name.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{detail.name}</p>
                <TierBadge tier={detail.tier} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { l:'Poin',        v: detail.points_balance.toLocaleString('id') + ' poin' },
                { l:'Total Belanja', v: formatRupiah(detail.total_transaction_amount, true) },
                { l:'Jumlah Transaksi', v: detail.total_transaction_count + 'x' },
                { l:'Bergabung', v: fmtDate(detail.created_at) },
              ].map(r => (
                <div key={r.l}>
                  <p className="text-xs text-secondary mb-1">{r.l}</p>
                  <p className="text-sm font-semibold text-primary">{r.v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => { setDetail(null); setModal(detail) }}>Edit</button>
              <button className="btn btn-ghost btn-sm flex-1" onClick={() => setDetail(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {modal !== undefined && (
        <MemberModal member={modal ?? undefined} onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); refetch() }} />
      )}
    </div>
  )
}

// Demo data
const DEMO_MEMBERS: Member[] = [
  { id:'m1', name:'Siti Rahayu', phone:'081234567890', email:'siti@email.com', tier:'gold', points_balance:2450, total_transaction_count:48, total_transaction_amount:5_280_000, is_active:true, birth_date:'1990-05-15', created_at:'2025-03-01T00:00:00Z' },
  { id:'m2', name:'Budi Santoso', phone:'082345678901', email:null, tier:'silver', points_balance:830, total_transaction_count:22, total_transaction_amount:1_450_000, is_active:true, birth_date:null, created_at:'2025-07-15T00:00:00Z' },
  { id:'m3', name:'Dewi Pratiwi', phone:'083456789012', email:'dewi@email.com', tier:'platinum', points_balance:8750, total_transaction_count:124, total_transaction_amount:14_200_000, is_active:true, birth_date:'1985-11-22', created_at:'2024-12-01T00:00:00Z' },
  { id:'m4', name:'Ahmad Fauzi', phone:'084567890123', email:null, tier:'bronze', points_balance:120, total_transaction_count:5, total_transaction_amount:320_000, is_active:true, birth_date:null, created_at:'2026-06-01T00:00:00Z' },
  { id:'m5', name:'Rina Kartini', phone:'085678901234', email:'rina@email.com', tier:'gold', points_balance:3100, total_transaction_count:67, total_transaction_amount:7_890_000, is_active:true, birth_date:'1992-08-30', created_at:'2025-01-20T00:00:00Z' },
]
