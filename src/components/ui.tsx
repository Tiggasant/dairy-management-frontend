import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
const variants: Record<Variant, string> = {
  primary: 'bg-hero text-white shadow-md shadow-brand-500/25 hover:brightness-105',
  secondary: 'bg-white text-ink border border-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-brand-600 hover:bg-brand-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

export function Button({ variant = 'primary', loading, size = 'md', block, className, children, disabled, ...rest }: ButtonProps) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-13 px-6 text-base' }
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant], sizes[size], block && 'w-full', className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

/* ---------- Form fields ---------- */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

const control = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 h-11 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(control, className)} />
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={cn(control, 'appearance-none bg-[length:16px] pr-9', className)}>{children}</select>
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(control, 'h-auto min-h-20 py-2.5', className)} />
}

/** Decimal input that works with mobile numeric keypads. */
export function NumberInput({ value, onChange, className, ...rest }:
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => { const v = e.target.value.replace(',', '.'); if (/^\d*\.?\d*$/.test(v)) onChange(v) }}
      className={cn('no-spinner', className)}
    />
  )
}

/* ---------- Surfaces ---------- */
export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn('block w-full rounded-2xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(27,29,51,.06)]',
        onClick && 'transition active:scale-[.99] hover:shadow-md', className)}
    >
      {children}
    </Comp>
  )
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'red' | 'amber' | 'brand'; children: ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-700', brand: 'bg-brand-100 text-brand-700',
  }
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>{children}</span>
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-500', className)} />
}

export function Loading() {
  return <div className="flex justify-center py-16"><Spinner className="size-7" /></div>
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
      <p className="font-medium">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-2 font-semibold underline">Try again</button>}
    </div>
  )
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: string; back?: boolean | string; actions?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mb-4 flex items-center gap-3">
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm active:scale-95"
          aria-label="Back"
        ><ArrowLeft className="size-5" /></button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

/* ---------- Bottom sheet (mobile) / centered dialog (desktop) ---------- */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-slate-100" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-3">{children}</div>
        {footer && <div className="safe-bottom border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Segmented tabs ---------- */
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="mb-4 flex rounded-xl bg-slate-200/60 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn('h-9 flex-1 rounded-lg text-sm font-semibold transition', value === o.value ? 'bg-white shadow-sm' : 'text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- hooks ---------- */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    mql.addEventListener('change', handler)
    handler()
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
