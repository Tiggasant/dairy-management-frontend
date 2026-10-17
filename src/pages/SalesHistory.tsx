import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { daysAgo, formatDateTime, toISODate } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import { Badge, Card, EmptyState, ErrorState, Field, Input, Loading, PageHeader } from '@/components/ui'

export default function SalesHistory() {
  const [params] = useSearchParams()
  const [from, setFrom] = useState(params.get('from') ?? daysAgo(6))
  const [to, setTo] = useState(params.get('to') ?? toISODate())
  const [page, setPage] = useState(0)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['sales', from, to, page],
    queryFn: () => api.sales(from, to, page),
    enabled: !!from && !!to && from <= to,
    placeholderData: (prev) => prev,
  })

  return (
    <div>
      <PageHeader title="Bill Details" subtitle="All bills in the selected period" back="/" />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="From"><Input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(0) }} /></Field>
        <Field label="To"><Input type="date" value={to} min={from} max={toISODate()} onChange={(e) => { setTo(e.target.value); setPage(0) }} /></Field>
      </div>

      {isLoading ? <Loading /> : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data || data.content.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-12" />} title="No bills in this period" />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">{data.totalElements} bill{data.totalElements === 1 ? '' : 's'}</p>
          <div className={`space-y-2 ${isFetching ? 'opacity-60' : ''}`}>
            {data.content.map((s) => (
              <Link key={s.id} to={`/receipt/${s.id}`}>
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Bill #{s.id}{s.customerName ? ` · ${s.customerName}` : ''}</p>
                    <p className="text-xs text-muted">{formatDateTime(s.saleDate)} · {s.createdBy}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      {s.cashAmount > 0 && <Badge tone="green">Cash</Badge>}
                      {s.upiAmount > 0 && <Badge tone="brand">UPI</Badge>}
                      {s.udhaarAmount > 0 && <Badge tone="red">Udhaar {formatMoney(s.udhaarAmount)}</Badge>}
                    </div>
                  </div>
                  <p className="text-lg font-extrabold">{formatMoney(s.totalAmount)}</p>
                </Card>
              </Link>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid size-10 place-items-center rounded-xl bg-white shadow-sm disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-5" /></button>
              <span className="text-sm text-muted">Page {data.page + 1} of {data.totalPages}</span>
              <button disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="grid size-10 place-items-center rounded-xl bg-white shadow-sm disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-5" /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
