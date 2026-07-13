import { useState } from 'react'
import { Eye, EyeOff, Store } from 'lucide-react'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)

  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Email dan password wajib diisi'); return }
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { token, user, outlet } = res.data.data

      // Pastikan user.outlets terisi — fallback ke field 'outlet' (singular) dari response
      if ((!user.outlets || user.outlets.length === 0) && outlet?.id) {
        user.outlets = [{ id: outlet.id, name: outlet.name }]
      }

      setAuth(token, user)
      navigate('/')
      toast.success(`Selamat datang, ${user.name}!`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Email atau password salah')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-elevated)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Card */}
        <div className="card" style={{ border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg,var(--color-primary-600),var(--color-secondary-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, boxShadow: 'var(--shadow-glow-primary)',
            }}>
              <Store size={28} color="#fff" />
            </div>
            <h1 className="text-2xl font-bold text-primary text-center">POS Enterprise</h1>
            <p className="text-sm text-secondary mt-1 text-center">Admin Panel — Masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input" type="email" autoFocus
                  placeholder="admin@contoh.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="relative">
                  <input
                    className="form-input" type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', height: 44, justifyContent: 'center', marginTop: 4 }}>
                {loading ? 'Memuat...' : 'Masuk'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4" style={{
            background: 'var(--bg-surface2)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            <p className="text-xs text-secondary text-center mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'Super Admin', email: 'superadmin@demo.pos', pw: 'Demo@123' },
                { role: 'Manajer', email: 'manager@demo.pos', pw: 'Demo@123' },
              ].map(c => (
                <button key={c.role}
                  className="btn btn-ghost btn-sm"
                  style={{ flexDirection: 'column', gap: 2, height: 'auto', padding: '8px', border: '1px solid var(--border-subtle)' }}
                  onClick={() => { setEmail(c.email); setPassword(c.pw) }}>
                  <span className="text-xs font-semibold text-primary">{c.role}</span>
                  <span className="text-xs text-tertiary">{c.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-tertiary mt-6">
          POS Enterprise v1.0.0 · © 2026 All rights reserved
        </p>
      </div>
    </div>
  )
}
