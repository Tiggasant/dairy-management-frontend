import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Plus, Printer, Share2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { SHOP_NAME, formatDateTime } from '@/lib/format'
import { formatMoney, formatQty } from '@/lib/money'
import { Button, ErrorState, Loading, PageHeader } from '@/components/ui'

export default function Receipt() {
  const { id } = useParams()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['sale', id], queryFn: () => api.sale(Number(id)), enabled: !!id })

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
  const { sale, items } = data

  const shareText = [
    `*${SHOP_NAME}* – Bill #${sale.id}`,
    formatDateTime(sale.saleDate),
    '',
    ...items.map((i) => `${i.productName}  ${formatQty(i.quantity)} ${i.unit} × ${i.sellingPrice} = ₹${i.subtotal.toFixed(2)}`),
    '',
    `*Total: ${formatMoney(sale.totalAmount)}*`,
    sale.udhaarAmount > 0 ? `Udhaar: ${formatMoney(sale.udhaarAmount)}` : '',
    'Thank you!',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n')

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print"><PageHeader title={`Bill #${sale.id}`} back="/" /></div>

      <div className="print-area rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          <CheckCircle2 className="no-print mb-2 size-12 text-emerald-500" />
          <h2 className="text-lg font-bold">{SHOP_NAME}</h2>
          <p className="text-xs text-muted">Bill #{sale.id} · {formatDateTime(sale.saleDate)}</p>
          <p className="text-xs text-muted">Served by {sale.createdBy}</p>
          {sale.customerName && <p className="mt-1 text-sm font-semibold">{sale.customerName}</p>}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dashed border-slate-300 text-left text-xs uppercase text-muted">
              <th className="pb-2 font-semibold">Item</th><th className="pb-2 text-right font-semibold">Qty</th><th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.productId} className="align-top">
                <td className="py-2 pr-2"><p className="font-medium">{i.productName}</p><p className="text-xs text-muted">{formatMoney(i.sellingPrice)} / {i.unit}</p></td>
                <td className="py-2 text-right">{formatQty(i.quantity)} {i.unit}</td>
                <td className="py-2 text-right font-semibold">{formatMoney(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1.5 border-t border-dashed border-slate-300 pt-3 text-sm">
          <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span>{formatMoney(sale.totalAmount)}</span></div>
          {sale.cashAmount > 0 && <Row label="Cash" value={sale.cashAmount} />}
          {sale.upiAmount > 0 && <Row label="UPI" value={sale.upiAmount} />}
          {sale.udhaarAmount > 0 && <Row label="Udhaar (pending)" value={sale.udhaarAmount} danger />}
        </div>
        <p className="mt-5 text-center text-xs text-muted">Thank you, visit again!</p>
      </div>

      <div className="no-print mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white"><Share2 className="size-4" />WhatsApp</a>
        <Link to="/sale" className="bg-hero col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl font-bold text-white"><Plus className="size-5" />New Sale</Link>
      </div>
    </div>
  )
}

function Row({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return <div className={`flex justify-between ${danger ? 'font-semibold text-rose-600' : 'text-muted'}`}><span>{label}</span><span>{formatMoney(value)}</span></div>
}
