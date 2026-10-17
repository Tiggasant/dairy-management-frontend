import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '@/lib/api'
import { toISODate } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import { Card, ErrorState, Field, Input, Loading, PageHeader } from '@/components/ui'

export default function Reports() {
  const [date, setDate] = useState(toISODate())
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['daily-report', date], queryFn: () => api.dailyReport(date), enabled: !!date })

  const total = data?.totalSales ?? 0
  const parts = data ? [
    { label: 'Cash', value: data.cashCollection, color: 'bg-emerald-500' },
    { label: 'UPI', value: data.upiCollection, color: 'bg-brand-500' },
    { label: 'Udhaar', value: data.udhaarAmount, color: 'bg-rose-500' },
  ] : []

  return (
    <div>
      <PageHeader title="Daily Report" subtitle="Whole shop, all counters" back="/" />
      <div className="mb-4"><Field label="Date"><Input type="date" value={date} max={toISODate()} onChange={(e) => setDate(e.target.value)} /></Field></div>

      {isLoading ? <Loading /> : isError || !data ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : (
        <div className="space-y-4">
          <div className="bg-hero rounded-3xl p-5 text-white shadow-lg shadow-brand-500/25">
            <p className="text-sm text-white/80">Total sales · {data.totalBills} bill{data.totalBills === 1 ? '' : 's'}</p>
            <p className="text-4xl font-extrabold tracking-tight">{formatMoney(data.totalSales)}</p>
          </div>

          <Card>
            <h2 className="mb-3 font-bold">How customers paid</h2>
            <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {total > 0 && parts.map((p) => <div key={p.label} className={p.color} style={{ width: `${(p.value / total) * 100}%` }} />)}
            </div>
            <ul className="space-y-2.5">
              {parts.map((p) => (
                <li key={p.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className={`size-3 rounded-full ${p.color}`} />{p.label}{total > 0 && <span className="text-muted">({Math.round((p.value / total) * 100)}%)</span>}</span>
                  <span className="font-bold">{formatMoney(p.value)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Link to={`/sales?from=${date}&to=${date}`} className="block rounded-xl bg-white py-3 text-center text-sm font-semibold text-brand-600 shadow-sm">View all bills of this day</Link>
        </div>
      )}
    </div>
  )
}
