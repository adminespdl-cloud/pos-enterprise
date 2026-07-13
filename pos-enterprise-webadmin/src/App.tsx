import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'

import { AppLayout }      from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LoginPage }      from '@/pages/auth/LoginPage'
import { DashboardPage }    from '@/pages/dashboard/DashboardPage'
import { TransactionsPage } from '@/pages/transactions/TransactionsPage'
import { ProductsPage }     from '@/pages/products/ProductsPage'
import { MembersPage }      from '@/pages/members/MembersPage'
import { ReportsPage }      from '@/pages/reports/ReportsPage'
import { OutletsPage }      from '@/pages/outlets/OutletsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index         element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="products"     element={<ProductsPage />} />
              <Route path="members"      element={<MembersPage />} />
              {/* Placeholder routes */}
              <Route path="shifts"   element={<ComingSoon title="Manajemen Shift" />} />
              <Route path="outlets"  element={<OutletsPage />} />
              <Route path="reports"  element={<ReportsPage />} />
              <Route path="alerts"   element={<ComingSoon title="Peringatan & Notifikasi" />} />
              <Route path="settings" element={<ComingSoon title="Pengaturan Sistem" />} />
              <Route path="*"        element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-surface3)',
            color:      'var(--text-primary)',
            border:     '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            fontSize:   '.875rem',
          },
          success: { iconTheme: { primary: 'var(--color-success-500)', secondary: 'white' } },
          error:   { iconTheme: { primary: 'var(--color-error-500)',   secondary: 'white' } },
        }}
      />
    </QueryClientProvider>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize: '3rem' }}>🚧</div>
      <h2 className="text-xl font-semibold text-primary">{title}</h2>
      <p className="text-sm text-secondary">Halaman ini sedang dalam pengembangan</p>
    </div>
  )
}
