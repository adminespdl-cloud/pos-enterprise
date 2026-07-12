import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  token: string | null
  user:  AuthUser | null
  currentOutletId: string | null

  setAuth:  (token: string, user: AuthUser) => void
  setOutlet:(id: string) => void
  logout:   () => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:           null,
      user:            null,
      currentOutletId: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        const firstOutlet = user.outlets?.[0]?.id ?? null
        set({
          token,
          user,
          isAuthenticated: true,
          currentOutletId: firstOutlet,
        })
      },

      setOutlet: (id) => set({ currentOutletId: id }),

      logout: () => set({ token: null, user: null, currentOutletId: null, isAuthenticated: false }),
    }),
    {
      name: 'pos-auth',
      partialize: (s) => ({ token: s.token, user: s.user, currentOutletId: s.currentOutletId }),
    }
  )
)
