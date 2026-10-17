import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EyeOff, History, Package, Pencil, Plus, Search } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { formatMoney, formatQty, parseAmount } from '@/lib/money'
import type { Product } from '@/lib/types'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, NumberInput, PageHeader, Sheet } from '@/components/ui'

const UNITS = ['litre', 'kg', 'gram', 'piece', 'packet', 'dozen']

export default function Products() {
  const { isOwner } = useAuth()
  const qc = useQueryClient()
  const products = useQuery({ queryKey: ['products'], queryFn: api.products })
  const stock = useQuery({ queryKey: ['stock-report'], queryFn: api.stockReport })
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [history, setHistory] = useState<Product | null>(null)

  const left = useMemo(() => new Map((stock.data ?? []).map((s) => [s.productId, s.availableStock])), [stock.data])
  const rows = (products.data ?? []).filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))

  const toggle = useMutation({
    mutationFn: (p: Product) => api.setProductActive(p.id, !p.active),
    onSuccess: (p) => { toast.success(p.active ? `${p.name} is visible at the counter` : `${p.name} hidden from the counter`); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['stock-report'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div>
      <PageHeader title="Products" subtitle={isOwner ? 'Prices, categories and visibility' : 'Price list'} back="/"
        actions={isOwner && <Button size="sm" onClick={() => setEditing('new')}><Plus className="size-4" />Add</Button>} />

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-10" />
      </div>

      {products.isLoading ? <Loading /> : products.isError ? <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} /> :
        rows.length === 0 ? <EmptyState icon={<Package className="size-12" />} title="No products" hint={isOwner ? 'Add your first product to start billing.' : undefined} /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((p) => (
              <Card key={p.id} className={p.active ? '' : 'opacity-60'}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{p.category}</p>
                  </div>
                  <p className="text-lg font-extrabold text-brand-600">{formatMoney(p.sellingPrice)}<span className="text-xs font-medium text-muted">/{p.unit}</span></p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={(left.get(p.id) ?? 0) <= p.lowStockThreshold ? 'red' : 'green'}>{formatQty(left.get(p.id) ?? 0)} {p.unit} in stock</Badge>
                  {!p.active && <Badge>Hidden</Badge>}
                </div>
                {isOwner && (
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(p)}><Pencil className="size-3.5" />Edit</Button>
                    <Button variant="secondary" size="sm" onClick={() => setHistory(p)}><History className="size-3.5" />Prices</Button>
                    <Button variant="ghost" size="sm" className="ml-auto" loading={toggle.isPending && toggle.variables?.id === p.id} onClick={() => toggle.mutate(p)}>
                      <EyeOff className="size-3.5" />{p.active ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

      {isOwner && <ProductForm product={editing} onClose={() => setEditing(null)} />}
      {isOwner && <PriceHistorySheet product={history} onClose={() => setHistory(null)} />}
    </div>
  )
}

function ProductForm({ product, onClose }: { product: Product | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient()
  const existing = product && product !== 'new' ? product : null
  const [f, setF] = useState({ name: '', category: '', unit: 'litre', price: '', threshold: '' })

  useEffect(() => {
    if (!product) return
    setF(existing
      ? { name: existing.name, category: existing.category, unit: existing.unit, price: String(existing.sellingPrice), threshold: String(existing.lowStockThreshold) }
      //liter
      : { name: '', category: '', unit: '', price: '', threshold: '5' })
  }, [product, existing])

  const save = useMutation({
    mutationFn: () => {
      const body = { name: f.name.trim(), category: f.category.trim(), unit: f.unit.trim(), sellingPrice: parseAmount(f.price), lowStockThreshold: parseAmount(f.threshold) }
      return existing ? api.updateProduct(existing.id, body) : api.createProduct(body)
    },
    onSuccess: () => { toast.success(existing ? 'Product updated' : 'Product added'); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['stock-report'] }); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const valid = f.name.trim() && f.category.trim() && f.unit.trim() && parseAmount(f.price) > 0

  return (
    <Sheet open={!!product} onClose={onClose} title={existing ? 'Edit product' : 'New product'}
      footer={<Button block size="lg" loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Save product</Button>}>
      <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Full cream milk" autoFocus /></Field>
      <Field label="Category"><Input list="categories" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Milk, Sweets, Curd" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit"><Input list="units" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
        <Field label="Selling price (₹)"><NumberInput value={f.price} onChange={(v) => setF({ ...f, price: v })} placeholder="0.00" /></Field>
      </div>
      <Field label="Low stock alert at" hint="You will see a warning when stock falls to this level or below.">
        <NumberInput value={f.threshold} onChange={(v) => setF({ ...f, threshold: v })} placeholder="0" />
      </Field>
      <datalist id="units">{[`LITRE`, `MILLILITRE`, `KILOGRAM`, `GRAM`, `PIECE`, `PACKET`, `POUCH`].map((u) => <option key={u} value={u} />)}</datalist>
      <datalist id="categories">{['Milk', 'Curd', 'Paneer', 'Ghee', 'Sweets', 'Butter'].map((c) => <option key={c} value={c} />)}</datalist>
    </Sheet>
  )
}

function PriceHistorySheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['price-history', product?.id], queryFn: () => api.priceHistory(product!.id), enabled: !!product })
  return (
    <Sheet open={!!product} onClose={onClose} title={product ? `${product.name} · price history` : ''}>
      {isLoading ? <Loading /> : (
        <ul className="divide-y divide-slate-100">
          {(data ?? []).map((h, i) => (
            <li key={h.id} className="flex items-center justify-between py-3">
              <span className="text-sm text-muted">{formatDateTime(h.effectiveFrom)}{i === 0 && <Badge tone="green"> current</Badge>}</span>
              <span className="font-bold">{formatMoney(h.sellingPrice)}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
