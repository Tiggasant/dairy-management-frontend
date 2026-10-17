import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BarChart3, ChevronRight, KeyRound, LogOut, ScrollText, Truck, UserCog } from 'lucide-react'
import type { ReactNode } from 'react'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, PageHeader, Sheet } from '@/components/ui'

export default function More() {
  const { user, isOwner, logout } = useAuth()
  const [changing, setChanging] = useState(false)

  return (
    <div>
      <PageHeader title="More" />
      <Card className="mb-5 flex items-center gap-4">
        <span className="bg-hero grid size-14 place-items-center rounded-full text-xl font-bold text-white">{user?.fullName.charAt(0).toUpperCase()}</span>
        <div><p className="text-lg font-bold">{user?.fullName}</p><p className="text-sm text-muted">@{user?.username} · {isOwner ? 'Owner' : 'Worker'}</p></div>
      </Card>

      <Card className="divide-y divide-slate-100 !p-0">
        <Item to="/stock" icon={<Truck className="size-5" />} label="Stock" />
        {isOwner && <Item to="/sales" icon={<ScrollText className="size-5" />} label="Bill details" />}
        {isOwner && <Item to="/reports" icon={<BarChart3 className="size-5" />} label="Daily report" />}
        {isOwner && <Item to="/team" icon={<UserCog className="size-5" />} label="Team & workers" />}
        <button onClick={() => setChanging(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <span className="text-brand-600"><KeyRound className="size-5" /></span><span className="flex-1 font-medium">Change password</span><ChevronRight className="size-4 text-slate-300" />
        </button>
      </Card>

      <Button variant="secondary" block className="mt-5 !text-rose-600" onClick={logout}><LogOut className="size-4" />Log out</Button>
      <ChangePassword open={changing} onClose={() => setChanging(false)} />
    </div>
  )
}

function Item({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return <Link to={to} className="flex items-center gap-3 px-4 py-3.5"><span className="text-brand-600">{icon}</span><span className="flex-1 font-medium">{label}</span><ChevronRight className="size-4 text-slate-300" /></Link>
}

function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const save = useMutation({
    mutationFn: () => api.changePassword(cur, next),
    // the server revokes every token on password change, so log in again with the new password
    onSuccess: () => { toast.success('Password changed. Please log in again.'); logout() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <Sheet open={open} onClose={onClose} title="Change password"
      footer={<Button block size="lg" loading={save.isPending} disabled={!cur || next.length < 8} onClick={() => save.mutate()}>Change password</Button>}>
      <Field label="Current password"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
      <Field label="New password" hint="At least 8 characters"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
    </Sheet>
  )
}
