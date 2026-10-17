import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HandCoins, Pencil, Phone, Power } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { formatMoney, fromPaise, parseAmount, toPaise } from '@/lib/money'
import CustomerForm from '@/components/CustomerForm'
import { Button, Card, EmptyState, ErrorState, Field, Input, Loading, NumberInput, PageHeader, Sheet } from '@/components/ui'

export default function CustomerDetail() {
  const { id } = useParams()
  const customerId = Number(id)
  const { isOwner } = useAuth()
  const qc = useQueryClient()
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState(false)

  const customers = useQuery({ queryKey: ['customers'], queryFn: api.customers })
  const balance = useQuery({ queryKey: ['balance', customerId], queryFn: () => api.customerBalance(customerId) })
  const payments = useQuery({ queryKey: ['payments', customerId], queryFn: () => api.payments(customerId) })
  const customer = customers.data?.find((c) => c.id === customerId)

  const toggle = useMutation({
    mutationFn: () => api.setCustomerActive(customerId, !customer!.active),
    onSuccess: (c) => { toast.success(c.active ? 'Customer activated' : 'Customer deactivated'); qc.invalidateQueries({ queryKey: ['customers'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (balance.isLoading || customers.isLoading) return <Loading />
  if (balance.isError || !balance.data) return <ErrorState message={errorMessage(balance.error)} onRetry={() => balance.refetch()} />
  const b = balance.data
  const owes = b.outstandingBalance > 0

  return (
    <div>
      <PageHeader title={b.customerName} subtitle={customer?.phone ?? undefined} back="/customers"
        actions={isOwner && customer && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="grid size-10 place-items-center rounded-xl bg-white shadow-sm" aria-label="Edit"><Pencil className="size-4" /></button>
            <button onClick={() => { if (confirm(customer.active ? 'Deactivate this customer?' : 'Activate this customer?')) toggle.mutate() }}
              className="grid size-10 place-items-center rounded-xl bg-white shadow-sm" aria-label="Toggle active"><Power className={`size-4 ${customer.active ? 'text-rose-500' : 'text-emerald-600'}`} /></button>
          </div>
        )} />

      <div className={`${owes ? 'bg-rose-card text-rose-950' : 'bg-teal-card text-emerald-950'} mb-4 rounded-3xl p-5 shadow-md`}>
        <p className="text-sm font-medium opacity-80">{owes ? 'Outstanding balance' : 'No pending balance'}</p>
        <p className="text-4xl font-extrabold tracking-tight">{formatMoney(Math.max(b.outstandingBalance, 0))}</p>
        <div className="mt-3 flex gap-6 text-sm"><span>Udhaar given <b>{formatMoney(b.totalUdhaar)}</b></span><span>Paid <b>{formatMoney(b.totalPaid)}</b></span></div>
      </div>

      {customer?.phone && (
        <a href={`tel:${customer.phone}`} className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-brand-600 shadow-sm"><Phone className="size-4" />Call {customer.phone}</a>
      )}

      <Button block size="lg" className="mb-6" disabled={!owes} onClick={() => setPaying(true)}><HandCoins className="size-5" />Receive payment</Button>

      <h2 className="mb-3 font-bold">Payment history</h2>
      {payments.isLoading ? <Loading /> : (payments.data ?? []).length === 0 ? <EmptyState title="No payments yet" /> : (
        <div className="space-y-2">
          {payments.data!.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div><p className="font-semibold text-emerald-600">+ {formatMoney(p.amount)}</p><p className="text-xs text-muted">{formatDateTime(p.paymentDate)} · {p.recordedBy}{p.notes ? ` · ${p.notes}` : ''}</p></div>
            </Card>
          ))}
        </div>
      )}

      <PaymentSheet open={paying} onClose={() => setPaying(false)} customerId={customerId} outstanding={b.outstandingBalance} />
      {customer && <CustomerForm open={editing} onClose={() => setEditing(false)} customer={customer} />}
    </div>
  )
}

function PaymentSheet({ open, onClose, customerId, outstanding }: { open: boolean; onClose: () => void; customerId: number; outstanding: number }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const amountPaise = toPaise(parseAmount(amount))
  const tooMuch = amountPaise > toPaise(outstanding)

  const save = useMutation({
    mutationFn: () => api.addPayment(customerId, fromPaise(amountPaise), notes.trim()),
    onSuccess: () => {
      toast.success('Payment recorded')
      for (const key of ['balance', 'payments', 'balances', 'summary']) qc.invalidateQueries({ queryKey: [key] })
      setAmount(''); setNotes(''); onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Sheet open={open} onClose={onClose} title="Receive payment"
      footer={<Button block size="lg" variant="success" loading={save.isPending} disabled={amountPaise <= 0 || tooMuch} onClick={() => save.mutate()}>Save payment</Button>}>
      <p className="text-sm text-muted">Pending: <b className="text-ink">{formatMoney(outstanding)}</b></p>
      <Field label="Amount received (₹)" error={tooMuch ? 'More than the pending balance' : undefined}>
        <NumberInput value={amount} onChange={setAmount} placeholder="0.00" autoFocus />
      </Field>
      <button onClick={() => setAmount(String(outstanding))} className="text-sm font-semibold text-brand-600">Full amount ({formatMoney(outstanding)})</button>
      <Field label="Note (optional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. paid by UPI" maxLength={250} /></Field>
    </Sheet>
  )
}
