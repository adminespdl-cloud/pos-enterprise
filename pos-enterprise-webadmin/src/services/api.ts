import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// ── Axios Instance ─────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 30_000,
})

// ── Request Interceptor — tambah token + outlet ────────────────────
api.interceptors.request.use((config) => {
  const { token, currentOutletId } = useAuthStore.getState()
  if (token)          config.headers.Authorization  = `Bearer ${token}`
  if (currentOutletId) config.headers['X-Outlet-ID'] = currentOutletId
  return config
})

// ── Response Interceptor — handle 401 ─────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ═══════════════════════════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════════════════════════
export const authApi = {
  login:  (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me:     () => api.get('/auth/me'),
}

// ═══════════════════════════════════════════════════════════════════
// REPORT API
// ═══════════════════════════════════════════════════════════════════
export const reportApi = {
  dashboard: (outlet_id?: string) =>
    api.get('/reports/dashboard', { params: { outlet_id } }),

  sales: (params: {
    date_from: string; date_to: string
    outlet_id?: string; group_by?: 'day' | 'week' | 'month'
  }) => api.get('/reports/sales', { params }),

  products: (params: {
    date_from: string; date_to: string; outlet_id?: string; limit?: number
  }) => api.get('/reports/products', { params }),
}

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION API
// ═══════════════════════════════════════════════════════════════════
export const transactionApi = {
  list: (params: {
    outlet_id?: string; status?: string
    date_from?: string; date_to?: string
    cashier_id?: string; per_page?: number; page?: number
  }) => api.get('/transactions', { params }),

  get:  (id: string) => api.get(`/transactions/${id}`),

  void: (id: string, body: { void_reason: string; manager_pin: string }) =>
    api.post(`/transactions/${id}/void`, body),
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT API
// ═══════════════════════════════════════════════════════════════════
export const productApi = {
  list: (params?: { category_id?: string; search?: string; per_page?: number; page?: number }) =>
    api.get('/products', { params }),

  get:    (id: string) => api.get(`/products/${id}`),
  create: (data: FormData | object) => api.post('/products', data),
  update: (id: string, data: object) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),

  categories: () => api.get('/categories'),
}

// ═══════════════════════════════════════════════════════════════════
// MEMBER API
// ═══════════════════════════════════════════════════════════════════
export const memberApi = {
  list:   (params?: { search?: string; tier?: string; per_page?: number; page?: number }) =>
    api.get('/members', { params }),
  get:    (id: string) => api.get(`/members/${id}`),
  create: (data: object) => api.post('/members', data),
  update: (id: string, data: object) => api.put(`/members/${id}`, data),
  search: (phone: string) => api.get('/members/search', { params: { phone } }),
}

// ═══════════════════════════════════════════════════════════════════
// SHIFT API
// ═══════════════════════════════════════════════════════════════════
export const shiftApi = {
  list: (params?: { outlet_id?: string; status?: string; date_from?: string; date_to?: string; per_page?: number }) =>
    api.get('/shifts', { params }),
  get: (id: string) => api.get(`/shifts/${id}`),
}
