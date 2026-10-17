import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Milk } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/api'
import { SHOP_NAME } from '@/lib/format'
import { Button, Field, Input } from '@/components/ui'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="bg-hero relative hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-bold"><Milk className="size-7" />{SHOP_NAME}</div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Billing, stock and udhaar,<br />all in one place.</h2>
          <p className="mt-4 max-w-md text-white/80">Fast counter billing for your workers. Complete control and reports for the owner.</p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} {SHOP_NAME}</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-5">
          <div className="mb-8 text-center lg:text-left">
            <div className="bg-hero mx-auto mb-4 grid size-16 place-items-center rounded-2xl text-white shadow-lg shadow-brand-500/30 lg:mx-0">
              <Milk className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted">Log in to {SHOP_NAME}</p>
          </div>

          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
              autoCapitalize="none" autoCorrect="off" required autoFocus placeholder="e.g. ramu" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required className="pr-11" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </Field>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}

          <Button type="submit" size="lg" block loading={busy} disabled={!username || !password}>Log in</Button>
        </form>
      </div>
    </div>
  )
}
