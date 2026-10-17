import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Phone, Plus, Search, Users } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatMoney } from '@/lib/money'
import CustomerForm from '@/components/CustomerForm'
import { Badge, Button, Card, EmptyState, ErrorState, Input, Loading, PageHeader, Tabs } from '@/components/ui'

export default function Customers() {
  const { isOwner } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'owing' && isOwner ? 'owing' : 'all'
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const customers = useQuery({ queryKey: ['customers'], queryFn: api.customers })
  const owing = useQuery({ queryKey: ['balances'], queryFn: api.outstandingBalances, enabled: isOwner })
  const q = search.trim().toLowerCase()

  const all = (customers.data ?? []).filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
  const owingRows = (owing.data ?? []).filter((c) => c.customerName.toLowerCase().includes(q))
  const totalOwing = (owing.data ?? []).reduce((s, c) => s + c.outstandingBalance, 0)

  return (
    <div>
      <PageHeader title="Customers" subtitle="Udhaar and payments" back="/"
        actions={<Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" />Add</Button>} />

      {isOwner && (
        <Tabs value={tab} onChange={(v) => setParams(v === 'owing' ? { tab: 'owing' } : {})}
          options={[{ value: 'all', label: 'All customers' }, { value: 'owing', label: 'Pending udhaar' }]} />
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone" className="pl-10" />
      </div>

      {tab === 'owing' ? (
        owing.isLoading ? <Loading /> : owing.isError ? <ErrorState message={errorMessage(owing.error)} onRetry={() => owing.refetch()} /> : (
          <>
            <div className="bg-rose-card mb-4 rounded-3xl p-5 text-rose-950 shadow-md">
              <p className="text-sm font-medium opacity-80">Total pending from customers</p>
              <p className="text-3xl font-extrabold">{formatMoney(totalOwing)}</p>
            </div>
            {owingRows.length === 0 ? <EmptyState icon={<Users className="size-12" />} title="Nobody owes you money" hint="All udhaar is cleared." /> : (
              <div className="space-y-2">
                {owingRows.map((c) => (
                  <Link key={c.customerId} to={`/customers/${c.customerId}`}>
                    <Card className="flex items-center justify-between">
                      <div><p className="font-semibold">{c.customerName}</p><p className="text-xs text-muted">Given {formatMoney(c.totalUdhaar)} · Paid {formatMoney(c.totalPaid)}</p></div>
                      <p className="text-lg font-extrabold text-rose-600">{formatMoney(c.outstandingBalance)}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )
      ) : customers.isLoading ? <Loading /> : customers.isError ? <ErrorState message={errorMessage(customers.error)} onRetry={() => customers.refetch()} /> :
        all.length === 0 ? <EmptyState icon={<Users className="size-12" />} title="No customers found" hint="Add regular customers to give them udhaar." /> : (
          <div className="space-y-2">
            {all.map((c) => (
              <Link key={c.id} to={`/customers/${c.id}`}>
                <Card className={`flex items-center gap-3 ${c.active ? '' : 'opacity-60'}`}>
                  <span className="bg-hero grid size-11 shrink-0 place-items-center rounded-full font-bold text-white">{c.name.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name} {!c.active && <Badge>Inactive</Badge>}</p>
                    {c.phone && <p className="flex items-center gap-1 text-xs text-muted"><Phone className="size-3" />{c.phone}</p>}
                  </div>
                  <ChevronRight className="size-5 text-slate-300" />
                </Card>
              </Link>
            ))}
          </div>
        )}

      <CustomerForm open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
