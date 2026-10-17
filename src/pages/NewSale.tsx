import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Minus, Plus, Search, ShoppingCart, Trash2, UserPlus } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { newRequestId } from '@/lib/format'
import { formatMoney, formatQty, fromPaise, lineTotalPaise, parseAmount, toPaise } from '@/lib/money'
import type { Product, SaleRequest } from '@/lib/types'
import CustomerForm from '@/components/CustomerForm'
import { Button, cn, EmptyState, ErrorState, Field, Loading, NumberInput, PageHeader, Select, Sheet, useMediaQuery } from '@/components/ui'

interface CartLine { productId: number; qty: string }

export default function NewSale() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const products = useQuery({ queryKey: ['products'], queryFn: api.products })
  const stock = useQuery({ queryKey: ['stock-report'], queryFn: api.stockReport })
  const customers = useQuery({ queryKey: ['customers'], queryFn: api.customers })

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState(false)
  const [pay, setPay] = useState({ cash: '', upi: '', udhaar: '' })
  const [touched, setTouched] = useState(false)
  const requestRef = useRef<{ sig: string; id: string } | null>(null)

  const available = useMemo(() => new Map((stock.data ?? []).map((s) => [s.productId, s.availableStock])), [stock.data])
  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data])
  const categories = useMemo(() => ['All', ...Array.from(new Set((products.data ?? []).map((p) => p.category))).sort()], [products.data])

  const visible = (products.data ?? []).filter((p) =>
    (category === 'All' || p.category === category) && p.name.toLowerCase().includes(search.trim().toLowerCase()))

  /* ---- cart math (integer paise, same rounding as the server) ---- */
  const lines = cart.flatMap((l) => {
    const product = byId.get(l.productId)
    if (!product) return []
    const qty = parseAmount(l.qty)
    const left = available.get(product.id) ?? 0
    return [{ ...l, product, quantity: qty, subtotal: lineTotalPaise(qty, product.sellingPrice), left, tooMany: qty > left }]
  })
  const totalPaise = lines.reduce((s, l) => s + l.subtotal, 0)
  const itemCount = lines.length

  const cashPaise = touched ? toPaise(parseAmount(pay.cash)) : totalPaise
  const upiPaise = touched ? toPaise(parseAmount(pay.upi)) : 0
  const udhaarPaise = touched ? toPaise(parseAmount(pay.udhaar)) : 0
  const diff = totalPaise - (cashPaise + upiPaise + udhaarPaise)

  const problems: string[] = []
  if (lines.some((l) => l.quantity <= 0)) problems.push('Enter a quantity for every item')
  if (lines.some((l) => l.tooMany)) problems.push('Some items exceed the available stock')
  if (totalPaise <= 0) problems.push('Bill total must be above ₹0')
  if (diff !== 0) problems.push(diff > 0 ? `${formatMoney(fromPaise(diff))} still to be assigned` : `Payments exceed the total by ${formatMoney(fromPaise(-diff))}`)
  if (udhaarPaise > 0 && !customerId) problems.push('Select a customer for udhaar')
  const canSubmit = itemCount > 0 && problems.length === 0

  /* ---- cart actions ---- */
  const add = (p: Product) => setCart((c) => c.some((l) => l.productId === p.id)
    ? c.map((l) => l.productId === p.id ? { ...l, qty: String(parseAmount(l.qty) + 1) } : l)
    : [...c, { productId: p.id, qty: '1' }])
  const setQty = (id: number, qty: string) => setCart((c) => c.map((l) => l.productId === id ? { ...l, qty } : l))
  const step = (id: number, delta: number) => setCart((c) => c.flatMap((l) => {
    if (l.productId !== id) return [l]
    const next = Math.round((parseAmount(l.qty) + delta) * 1000) / 1000
    return next <= 0 ? [] : [{ ...l, qty: String(next) }]
  }))
  const remove = (id: number) => setCart((c) => c.filter((l) => l.productId !== id))

  const setPayment = (patch: Partial<typeof pay>) => {
    const base = touched ? pay : { cash: String(fromPaise(totalPaise)), upi: '', udhaar: '' }
    setPay({ ...base, ...patch })
    setTouched(true)
  }
  const allTo = (key: 'cash' | 'upi' | 'udhaar') => {
    setPay({ cash: '', upi: '', udhaar: '', [key]: String(fromPaise(totalPaise)) })
    setTouched(true)
  }

  /* ---- submit ---- */
  const submit = useMutation({
    mutationFn: () => {
      const req: Omit<SaleRequest, 'clientRequestId'> = {
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        cashAmount: fromPaise(cashPaise), upiAmount: fromPaise(upiPaise), udhaarAmount: fromPaise(udhaarPaise),
        customerId: customerId ? Number(customerId) : null,
      }
      // Same bill retried (e.g. after a timeout) re-uses the same id so the server never creates a duplicate.
      const sig = JSON.stringify(req)
      if (requestRef.current?.sig !== sig) requestRef.current = { sig, id: newRequestId() }
      return api.createSale({ ...req, clientRequestId: requestRef.current.id })
    },
    onSuccess: (res) => {
      requestRef.current = null
      toast.success(`Bill #${res.sale.id} saved`)
      qc.invalidateQueries({ queryKey: ['stock-report'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['balances'] })
      navigate(`/receipt/${res.sale.id}`, { replace: true })
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      qc.invalidateQueries({ queryKey: ['stock-report'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const checkout = (
    <div className="space-y-5">
      {lines.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="size-10" />} title="Cart is empty" hint="Tap a product to add it to the bill." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {lines.map((l) => (
            <li key={l.productId} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.product.name}</p>
                  <p className="text-xs text-muted">{formatMoney(l.product.sellingPrice)} / {l.product.unit}</p>
                </div>
                <p className="font-bold">{formatMoney(fromPaise(l.subtotal))}</p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => step(l.productId, -1)} className="grid size-9 place-items-center rounded-lg bg-slate-100 active:scale-95" aria-label="Decrease"><Minus className="size-4" /></button>
                <NumberInput value={l.qty} onChange={(v) => setQty(l.productId, v)} className={cn('h-9 w-20 text-center', l.tooMany && 'border-rose-400')} aria-label={`Quantity of ${l.product.name}`} />
                <button onClick={() => step(l.productId, 1)} className="grid size-9 place-items-center rounded-lg bg-slate-100 active:scale-95" aria-label="Increase"><Plus className="size-4" /></button>
                <span className="text-xs text-muted">{l.product.unit}</span>
                <button onClick={() => remove(l.productId)} className="ml-auto grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label="Remove"><Trash2 className="size-4" /></button>
              </div>
              {l.tooMany && <p className="mt-1 text-xs font-medium text-rose-600">Only {formatQty(l.left)} {l.product.unit} in stock</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
        <span className="font-semibold text-brand-700">Total</span>
        <span className="text-2xl font-extrabold text-brand-700">{formatMoney(fromPaise(totalPaise))}</span>
      </div>

      {itemCount > 0 && (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(['cash', 'upi', 'udhaar'] as const).map((k) => (
                <button key={k} onClick={() => allTo(k)} className="rounded-xl border border-slate-200 py-2 text-xs font-semibold capitalize active:bg-brand-50">All {k === 'upi' ? 'UPI' : k}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Cash"><NumberInput value={touched ? pay.cash : String(fromPaise(totalPaise))} onChange={(v) => setPayment({ cash: v })} placeholder="0" /></Field>
              <Field label="UPI"><NumberInput value={touched ? pay.upi : ''} onChange={(v) => setPayment({ upi: v })} placeholder="0" /></Field>
              <Field label="Udhaar"><NumberInput value={touched ? pay.udhaar : ''} onChange={(v) => setPayment({ udhaar: v })} placeholder="0" /></Field>
            </div>
          </div>

          <Field label={udhaarPaise > 0 ? 'Customer (required for udhaar)' : 'Customer (optional)'}>
            <div className="flex gap-2">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {(customers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </Select>
              <button onClick={() => setNewCustomer(true)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-brand-600" aria-label="Add customer"><UserPlus className="size-5" /></button>
            </div>
          </Field>

          {problems.length > 0 && <ul className="space-y-1 text-sm font-medium text-amber-700">{problems.map((p) => <li key={p}>• {p}</li>)}</ul>}
        </>
      )}

      <Button block size="lg" variant="success" disabled={!canSubmit} loading={submit.isPending} onClick={() => submit.mutate()}>
        Save bill · {formatMoney(fromPaise(totalPaise))}
      </Button>
    </div>
  )

  return (
    <div>
      <PageHeader title="New Sale" subtitle="Tap products to build the bill" back="/" />

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">
        <section>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[15px] outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" />
          </div>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition', category === c ? 'bg-hero text-white' : 'bg-white text-muted')}>{c}</button>
            ))}
          </div>

          {products.isLoading || stock.isLoading ? <Loading /> : products.isError ? (
            <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />
          ) : visible.length === 0 ? (
            <EmptyState title="No products found" hint={products.data?.length ? 'Try another search.' : 'Ask the owner to add products first.'} />
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 lg:pb-6">
              {visible.map((p) => {
                const left = available.get(p.id) ?? 0
                const inCart = lines.find((l) => l.productId === p.id)
                const out = left <= 0
                return (
                  <button key={p.id} disabled={out} onClick={() => add(p)}
                    className={cn('relative rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(27,29,51,.06)] transition active:scale-[.97]',
                      inCart && 'ring-2 ring-brand-500', out && 'opacity-50')}>
                    {inCart && <span className="bg-hero absolute right-2.5 top-2.5 grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold text-white">{formatQty(inCart.quantity)}</span>}
                    <p className="pr-7 font-semibold leading-snug">{p.name}</p>
                    <p className="mt-1 text-lg font-extrabold text-brand-600">{formatMoney(p.sellingPrice)}<span className="text-xs font-medium text-muted"> /{p.unit}</span></p>
                    <p className={cn('mt-1 text-xs font-medium', out ? 'text-rose-600' : left <= p.lowStockThreshold ? 'text-amber-600' : 'text-muted')}>
                      {out ? 'Out of stock' : `${formatQty(left)} ${p.unit} left`}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {isDesktop && (
          <aside className="sticky top-8 h-fit rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Current bill</h2>
            {checkout}
          </aside>
        )}
      </div>

      {!isDesktop && itemCount > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-3 pt-3 backdrop-blur">
          <Button block size="lg" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="size-5" />View bill ({itemCount}) · {formatMoney(fromPaise(totalPaise))}
          </Button>
        </div>
      )}
      {!isDesktop && <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title="Current bill">{checkout}</Sheet>}

      <CustomerForm open={newCustomer} onClose={() => setNewCustomer(false)} onSaved={(c) => setCustomerId(String(c.id))} />
    </div>
  )
}
