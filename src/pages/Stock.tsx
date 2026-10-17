import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Truck } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { formatQty, parseAmount } from '@/lib/money'
import type { MovementType, StockRow } from '@/lib/types'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, NumberInput, PageHeader, Select, Sheet, Tabs } from '@/components/ui'

type Mode = { kind: 'purchase' | 'adjust'; productId?: number } | null

const LABEL: Record<MovementType, string> = {
  PURCHASE: 'Received', SALE: 'Sold', WASTAGE: 'Wastage', ADJUSTMENT_IN: 'Correction (+)', ADJUSTMENT_OUT: 'Correction (−)',
}

export default function Stock() {
  const { isOwner } = useAuth()
  const [tab, setTab] = useState<'stock' | 'history'>('stock')
  const [mode, setMode] = useState<Mode>(null)
  const report = useQuery({ queryKey: ['stock-report'], queryFn: api.stockReport })
  const rows = report.data ?? []

  return (
    <div>
      <PageHeader title="Stock" subtitle="Live stock, calculated from every movement" back="/"
        actions={isOwner && <Button size="sm" onClick={() => setMode({ kind: 'purchase' })}><Truck className="size-4" />Receive</Button>} />

      {isOwner && <Tabs value={tab} onChange={setTab} options={[{ value: 'stock', label: 'Current stock' }, { value: 'history', label: 'History' }]} />}

      {tab === 'stock' ? (
        report.isLoading ? <Loading /> : report.isError ? <ErrorState message={errorMessage(report.error)} onRetry={() => report.refetch()} /> :
          rows.length === 0 ? <EmptyState icon={<Truck className="size-12" />} title="No products yet" /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((r) => <StockCard key={r.productId} row={r} isOwner={isOwner} onReceive={() => setMode({ kind: 'purchase', productId: r.productId })} onAdjust={() => setMode({ kind: 'adjust', productId: r.productId })} />)}
            </div>
          )
      ) : <History />}

      {isOwner && <MovementForm mode={mode} rows={rows} onClose={() => setMode(null)} />}
    </div>
  )
}

function StockCard({ row, isOwner, onReceive, onAdjust }: { row: StockRow; isOwner: boolean; onReceive: () => void; onAdjust: () => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.productName}</p>
          <p className="text-xs text-muted">Alert at {formatQty(row.lowStockThreshold)} {row.unit}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-extrabold ${row.lowStock ? 'text-rose-600' : ''}`}>{formatQty(row.availableStock)}</p>
          <p className="text-xs text-muted">{row.unit}</p>
        </div>
      </div>
      {row.lowStock && <div className="mt-2"><Badge tone="red"><AlertTriangle className="mr-1 size-3" />Low stock</Badge></div>}
      {isOwner && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <Button variant="secondary" size="sm" onClick={onReceive}>Receive</Button>
          <Button variant="secondary" size="sm" onClick={onAdjust}>Wastage / fix</Button>
        </div>
      )}
    </Card>
  )
}

function History() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['movements', page], queryFn: () => api.movements(page), placeholderData: (p) => p })
  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
  if (data.content.length === 0) return <EmptyState title="No stock movements yet" />
  return (
    <>
      <div className="space-y-2">
        {data.content.map((m) => {
          const inbound = m.movementType === 'PURCHASE' || m.movementType === 'ADJUSTMENT_IN'
          return (
            <Card key={m.id} className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-xl ${inbound ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {inbound ? <ArrowDownRight className="size-5" /> : <ArrowUpRight className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.productName}</p>
                <p className="truncate text-xs text-muted">{LABEL[m.movementType]} · {formatDateTime(m.createdAt)} · {m.createdBy}{m.notes ? ` · ${m.notes}` : ''}</p>
              </div>
              <p className={`font-bold ${inbound ? 'text-emerald-600' : 'text-rose-600'}`}>{inbound ? '+' : '−'}{formatQty(m.quantity)}</p>
            </Card>
          )
        })}
      </div>
      {data.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid size-10 place-items-center rounded-xl bg-white shadow-sm disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-5" /></button>
          <span className="text-sm text-muted">Page {data.page + 1} of {data.totalPages}</span>
          <button disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="grid size-10 place-items-center rounded-xl bg-white shadow-sm disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-5" /></button>
        </div>
      )}
    </>
  )
}

function MovementForm({ mode, rows, onClose }: { mode: Mode; rows: StockRow[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<Exclude<MovementType, 'PURCHASE' | 'SALE'>>('WASTAGE')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [lastMode, setLastMode] = useState<Mode>(null)

  // reset the form each time it is opened
  if (mode !== lastMode) {
    setLastMode(mode)
    if (mode) { setProductId(mode.productId ? String(mode.productId) : ''); setQty(''); setNotes(''); setType('WASTAGE') }
  }

  const save = useMutation({
    mutationFn: () => mode?.kind === 'purchase'
      ? api.purchase(Number(productId), parseAmount(qty), notes.trim())
      : api.adjust(Number(productId), type, parseAmount(qty), notes.trim()),
    onSuccess: () => {
      toast.success(mode?.kind === 'purchase' ? 'Stock received' : 'Stock updated')
      qc.invalidateQueries({ queryKey: ['stock-report'] }); qc.invalidateQueries({ queryKey: ['movements'] }); qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const unit = rows.find((r) => String(r.productId) === productId)?.unit

  return (
    <Sheet open={!!mode} onClose={onClose} title={mode?.kind === 'purchase' ? 'Receive stock' : 'Wastage / correction'}
      footer={<Button block size="lg" loading={save.isPending} disabled={!productId || parseAmount(qty) <= 0} onClick={() => save.mutate()}>Save</Button>}>
      <Field label="Product">
        <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select product</option>
          {rows.map((r) => <option key={r.productId} value={r.productId}>{r.productName}</option>)}
        </Select>
      </Field>
      {mode?.kind === 'adjust' && (
        <Field label="What happened?">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="WASTAGE">Wastage / spoiled (stock goes down)</option>
            <option value="ADJUSTMENT_OUT">Correction: remove stock</option>
            <option value="ADJUSTMENT_IN">Correction: add stock</option>
          </Select>
        </Field>
      )}
      <Field label={`Quantity${unit ? ` (${unit})` : ''}`}><NumberInput value={qty} onChange={setQty} placeholder="0" /></Field>
      <Field label="Note (optional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={mode?.kind === 'purchase' ? 'e.g. Morning delivery, Ramesh dairy' : 'Reason'} maxLength={255} /></Field>
    </Sheet>
  )
}
