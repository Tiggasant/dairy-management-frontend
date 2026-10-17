const dateTime = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const dateOnly = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

/** Backend sends local date-times without a zone ("2026-10-17T09:30:00"): parse as local time. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatLongDate = (d: Date = new Date()) => dateOnly.format(d)

/** yyyy-MM-dd in the user's local zone (what <input type=date> and the API use). */
export function toISODate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

export const SHOP_NAME: string = import.meta.env.VITE_SHOP_NAME ?? 'Ghunsai Dairy'

export function newRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
