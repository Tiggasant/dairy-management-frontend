/**
 * Money helpers. The server rounds every bill line to 2 decimals (HALF_UP) and requires
 * cash + UPI + udhaar to equal the total EXACTLY, so the client must compute in integer paise
 * with the same rule instead of using floating point.
 */
export const toPaise = (rupees: number) => Math.round(rupees * 100)
export const fromPaise = (paise: number) => paise / 100

/** quantity (up to 3 decimals) x price (2 decimals) -> paise, rounded HALF_UP like the backend. */
export function lineTotalPaise(quantity: number, price: number): number {
  const qtyMilli = Math.round(quantity * 1000)
  const pricePaise = Math.round(price * 100)
  return Math.floor((qtyMilli * pricePaise + 500) / 1000)
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
export const formatMoney = (value: number | null | undefined) => inr.format(value ?? 0)

const qtyFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 })
export const formatQty = (value: number) => qtyFmt.format(value)

/** Parses user input like "12", "12.5", "" -> number (NaN-safe, never negative). */
export function parseAmount(text: string): number {
  const n = Number.parseFloat(text)
  return Number.isFinite(n) && n > 0 ? n : 0
}
