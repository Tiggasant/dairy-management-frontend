import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, BarChart3, ChevronRight, HandCoins, Package, ScrollText, Smartphone, TrendingUp,
  Truck, UserCog, Users, Wallet,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatLongDate, SHOP_NAME } from '@/lib/format'
import { formatMoney, formatQty } from '@/lib/money'
import { Card, ErrorState, Loading } from '@/components/ui'
import type { Dashboard as DashboardData } from '@/lib/types'

interface Action { to: string; label: string; icon: ComponentType<{ className?: string }>; tone: string }

const OWNER_ACTIONS: Action[] = [
  { to: '/customers', label: 'Customers', icon: Users, tone: 'bg-violet-100 text-violet-600' },
  { to: '/products', label: 'Products', icon: Package, tone: 'bg-fuchsia-100 text-fuchsia-600' },
  { to: '/stock', label: 'Stock', icon: Truck, tone: 'bg-sky-100 text-sky-600' },
  { to: '/sales', label: 'Bill Details', icon: ScrollText, tone: 'bg-pink-100 text-pink-600' },
  { to: '/reports', label: 'Reports', icon: BarChart3, tone: 'bg-amber-100 text-amber-600' },
  { to: '/team', label: 'Team', icon: UserCog, tone: 'bg-emerald-100 text-emerald-600' },
]
const WORKER_ACTIONS: Action[] = [
  { to: '/customers', label: 'Customers', icon: Users, tone: 'bg-violet-100 text-violet-600' },
  { to: '/products', label: 'Products', icon: Package, tone: 'bg-fuchsia-100 text-fuchsia-600' },
  { to: '/stock', label: 'Stock', icon: Truck, tone: 'bg-sky-100 text-sky-600' },
  { to: '/more', label: 'My Account', icon: UserCog, tone: 'bg-emerald-100 text-emerald-600' },
]

export default function Dashboard() {
  const { user, isOwner } = useAuth()

  // Owner sees the whole shop, a worker sees only the bills he made himself (cash to hand over).
  const summary = useQuery({
    queryKey: ['summary', isOwner],
    queryFn: async (): Promise<DashboardData> => {
      if (isOwner) return api.dashboard()
      const r = await api.myDailyReport()
      return { todaySales: r.totalSales, cashCollection: r.cashCollection, upiCollection: r.upiCollection, todayUdhaar: r.udhaarAmount, totalBills: r.totalBills }
    },
    refetchInterval: 60_000,
  })

  const stock = useQuery({ queryKey: ['stock-report'], queryFn: api.stockReport })
  const lowStock = (stock.data ?? []).filter((s) => s.lowStock)
  const owing = useQuery({ queryKey: ['balances'], queryFn: api.outstandingBalances, enabled: isOwner })

  const d = summary.data
  const actions = isOwner ? OWNER_ACTIONS : WORKER_ACTIONS

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium text-muted">{formatLongDate()}</p>
        <h1 className="text-2xl font-bold tracking-tight">{isOwner ? 'Dashboard' : `Hello, ${user?.fullName.split(' ')[0]}`}</h1>
        <p className="text-sm text-muted">{SHOP_NAME}{isOwner ? '' : ' · counter'}</p>
      </header>

      {summary.isLoading ? <Loading /> : summary.isError || !d ? (
        <ErrorState message="Could not load today's numbers." onRetry={() => summary.refetch()} />
      ) : (
        <section className="grid grid-cols-2 gap-3">
          <Link to={isOwner ? '/reports' : '/sale'} className="bg-hero col-span-2 flex items-center gap-4 rounded-3xl p-5 text-white shadow-lg shadow-brand-500/25">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20"><TrendingUp className="size-6" /></div>
            <div className="flex-1">
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-widest">TODAY</span>
              <p className="mt-1.5 text-sm text-white/80">{isOwner ? 'Total Sales' : 'My Sales'} · {d.totalBills} bill{d.totalBills === 1 ? '' : 's'}</p>
              <p className="text-3xl font-extrabold tracking-tight">{formatMoney(d.todaySales)}</p>
            </div>
            <ChevronRight className="size-5 text-white/70" />
          </Link>

          <StatCard className="bg-teal-card text-emerald-950" icon={<Wallet className="size-5" />} label={isOwner ? 'Cash collected' : 'Cash to hand over'} value={d.cashCollection} />
          <StatCard className="bg-orange-card text-orange-950" icon={<Smartphone className="size-5" />} label="UPI received" value={d.upiCollection} />
          <StatCard className="bg-rose-card col-span-2 text-rose-950" icon={<HandCoins className="size-5" />} label="Udhaar given today" value={d.todayUdhaar} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map(({ to, label, icon: Icon, tone }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-3 rounded-3xl bg-white px-3 py-6 shadow-[0_1px_3px_rgba(27,29,51,.06)] transition active:scale-[.97] hover:shadow-md">
              <span className={`grid size-14 place-items-center rounded-2xl ${tone}`}><Icon className="size-6" /></span>
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {lowStock.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><AlertTriangle className="size-5 text-amber-500" />Low stock</h2>
          <Card className="divide-y divide-slate-100 !p-0">
            {lowStock.slice(0, 5).map((s) => (
              <Link key={s.productId} to="/stock" className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{s.productName}</span>
                <span className="text-sm font-semibold text-rose-600">{formatQty(s.availableStock)} {s.unit} left</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {isOwner && (owing.data?.length ?? 0) > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Pending udhaar</h2>
            <Link to="/customers?tab=owing" className="text-sm font-semibold text-brand-600">View all</Link>
          </div>
          <Card className="divide-y divide-slate-100 !p-0">
            {owing.data!.slice(0, 5).map((c) => (
              <Link key={c.customerId} to={`/customers/${c.customerId}`} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{c.customerName}</span>
                <span className="font-bold text-rose-600">{formatMoney(c.outstandingBalance)}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, className }: { icon: ReactNode; label: string; value: number; className: string }) {
  return (
    <div className={`rounded-3xl p-4 shadow-md ${className}`}>
      <div className="mb-4 grid size-10 place-items-center rounded-xl bg-white/40">{icon}</div>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-extrabold">{formatMoney(value)}</p>
    </div>
  )
}
