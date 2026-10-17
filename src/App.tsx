import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import { RequireAuth, RequireRole } from '@/components/Guards'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import NewSale from '@/pages/NewSale'
import Receipt from '@/pages/Receipt'
import SalesHistory from '@/pages/SalesHistory'
import Products from '@/pages/Products'
import Stock from '@/pages/Stock'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import Reports from '@/pages/Reports'
import Team from '@/pages/Team'
import More from '@/pages/More'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* OWNER + WORKER */}
          <Route index element={<Dashboard />} />
          <Route path="sale" element={<NewSale />} />
          <Route path="receipt/:id" element={<Receipt />} />
          <Route path="products" element={<Products />} />
          <Route path="stock" element={<Stock />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="more" element={<More />} />

          {/* OWNER only */}
          <Route element={<RequireRole roles={['OWNER']} />}>
            <Route path="sales" element={<SalesHistory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
