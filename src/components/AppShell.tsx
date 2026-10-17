import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Receipt, Package, Users, Menu, Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { SHOP_NAME } from '@/lib/format'
import { cn } from './ui'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/sale', label: 'Sale', icon: Receipt },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/more', label: 'More', icon: Menu },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // The POS screen has its own sticky action bar; hide the floating button there.
  const showFab = !pathname.startsWith('/sale') && !pathname.startsWith('/receipt')
  // Full-screen POS on phones: no bottom navigation while billing (the page has its own back button).
  const hideNavOnMobile = pathname.startsWith('/sale')

  return (
    <div className="min-h-dvh lg:flex">
      {/* desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <img src="/favicon.svg" alt="" className="size-10" />
          <div>
            <p className="font-bold leading-tight">{SHOP_NAME}</p>
            <p className="text-xs text-muted">{user?.role === 'OWNER' ? 'Owner' : 'Counter'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-brand-50 text-brand-600' : 'text-muted hover:bg-slate-50')}>
              <Icon className="size-5" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 pt-3">
          <p className="truncate px-2 text-sm font-semibold">{user?.fullName}</p>
          <p className="mb-2 truncate px-2 text-xs text-muted">@{user?.username}</p>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
            <LogOut className="size-4" />Log out
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      {showFab && (
        <button
          onClick={() => navigate('/sale')}
          className="no-print fixed bottom-24 left-1/2 z-30 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-hero px-8 text-base font-bold text-white shadow-xl shadow-brand-500/40 active:scale-95 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0"
        >
          <Plus className="size-5" />New Sale
        </button>
      )}

      {/* mobile bottom nav */}
      <nav className={cn('no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden', hideNavOnMobile && 'hidden')}>
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', isActive ? 'text-brand-600' : 'text-muted')}>
              <Icon className="size-[22px]" />{label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
