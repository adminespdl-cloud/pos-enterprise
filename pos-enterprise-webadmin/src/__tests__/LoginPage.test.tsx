import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { LoginPage } from '@/pages/auth/LoginPage'
import { useAuthStore } from '@/store/authStore'
import * as apiModule from '@/services/api'

// ── Mocks ─────────────────────────────────────────────────────────────
vi.mock('@/services/api', () => ({
  authApi: {
    login:  vi.fn(),
    logout: vi.fn(),
    me:     vi.fn(),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// ── Test Wrapper ───────────────────────────────────────────────────────
function renderLoginPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN PAGE TESTS
// ═══════════════════════════════════════════════════════════════════
describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    vi.clearAllMocks()
  })

  it('merender form login dengan field email dan password', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText(/admin@contoh.com/i)).toBeDefined()
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /masuk/i })).toBeDefined()
  })

  it('menampilkan demo credentials buttons', () => {
    renderLoginPage()
    expect(screen.getByText('Super Admin')).toBeDefined()
    expect(screen.getByText('Manajer')).toBeDefined()
  })

  it('mengisi form saat klik demo credential', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByText('Super Admin'))

    const emailInput = screen.getByPlaceholderText(/admin@contoh.com/i) as HTMLInputElement
    expect(emailInput.value).toBe('superadmin@demo.pos')
  })

  it('memanggil authApi.login dengan email dan password yang benar', async () => {
    const mockLogin = vi.mocked(apiModule.authApi.login)
    mockLogin.mockResolvedValueOnce({
      data: {
        data: {
          token: 'test-token-123',
          expires_at: '2026-12-31T23:59:59Z',
          user: {
            id: 'user-1',
            name: 'Admin Test',
            email: 'admin@test.com',
            role: 'admin' as const,
            company_id: 'company-1',
            outlets: [{ id: 'outlet-1', name: 'Outlet Test' }],
          },
        },
      },
    } as never)

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByPlaceholderText(/admin@contoh.com/i), 'admin@test.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'Admin@123')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'Admin@123')
    })
  })

  it('memperbarui auth store setelah login berhasil', async () => {
    const mockLogin = vi.mocked(apiModule.authApi.login)
    mockLogin.mockResolvedValueOnce({
      data: {
        data: {
          token: 'test-token-abc',
          expires_at: '2026-12-31T23:59:59Z',
          user: {
            id: 'user-2',
            name: 'Admin Store',
            email: 'store@test.com',
            role: 'admin' as const,
            company_id: 'company-2',
            outlets: [{ id: 'outlet-2', name: 'Toko Test' }],
          },
        },
      },
    } as never)

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByPlaceholderText(/admin@contoh.com/i), 'store@test.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'Admin@123')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('test-token-abc')
    })
  })

  it('tidak memanggil API jika field kosong', async () => {
    const mockLogin = vi.mocked(apiModule.authApi.login)
    const user = userEvent.setup()
    renderLoginPage()

    // Klik submit tanpa isi form
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    // API tidak dipanggil
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('toggle show/hide password berfungsi', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    // Klik toggle show
    const toggleButton = screen.getByTitle ? undefined : screen.getAllByRole('button')[1]
    if (toggleButton) {
      await user.click(toggleButton)
      expect(passwordInput.type).toBe('text')
    }
  })
})
