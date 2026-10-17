import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Plus, Power, UserCog } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import type { Role, User } from '@/lib/types'
import { Badge, Button, Card, ErrorState, Field, Input, Loading, PageHeader, Select, Sheet } from '@/components/ui'

export default function Team() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const users = useQuery({ queryKey: ['users'], queryFn: api.users })
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState<User | null>(null)

  const toggle = useMutation({
    mutationFn: (u: User) => api.setUserActive(u.id, !u.active),
    onSuccess: (u) => { toast.success(u.active ? `${u.fullName} can log in again` : `${u.fullName} has been logged out and blocked`); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div>
      <PageHeader title="Team" subtitle="Workers who can use the billing counter" back="/more"
        actions={<Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" />Add</Button>} />

      {users.isLoading ? <Loading /> : users.isError ? <ErrorState message={errorMessage(users.error)} onRetry={() => users.refetch()} /> : (
        <div className="space-y-3">
          {users.data!.map((u) => (
            <Card key={u.id} className={u.active ? '' : 'opacity-60'}>
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{u.fullName.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.fullName}</p>
                  <p className="truncate text-xs text-muted">@{u.username} · {u.lastLoginAt ? `last login ${formatDateTime(u.lastLoginAt)}` : 'never logged in'}</p>
                </div>
                <div className="flex flex-col items-end gap-1"><Badge tone={u.role === 'OWNER' ? 'brand' : 'slate'}>{u.role === 'OWNER' ? 'Owner' : 'Worker'}</Badge>{!u.active && <Badge tone="red">Blocked</Badge>}</div>
              </div>
              {u.id !== me?.id && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Button variant="secondary" size="sm" onClick={() => setResetting(u)}><KeyRound className="size-3.5" />Reset password</Button>
                  <Button variant="ghost" size="sm" className="ml-auto" loading={toggle.isPending && toggle.variables?.id === u.id}
                    onClick={() => { if (!u.active || confirm(`Block ${u.fullName}? They will be logged out immediately.`)) toggle.mutate(u) }}>
                    <Power className="size-3.5" />{u.active ? 'Block' : 'Unblock'}
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {users.data!.length === 1 && <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted"><UserCog className="size-4" />Add your workers so each bill shows who made it.</p>}
        </div>
      )}

      <AddUser open={adding} onClose={() => setAdding(false)} />
      <ResetPassword user={resetting} onClose={() => setResetting(null)} />
    </div>
  )
}

function AddUser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ fullName: '', username: '', password: '', role: 'WORKER' as Role })
  const save = useMutation({
    mutationFn: () => api.createUser({ ...f, username: f.username.trim(), fullName: f.fullName.trim() }),
    onSuccess: (u) => { toast.success(`${u.fullName} added`); qc.invalidateQueries({ queryKey: ['users'] }); setF({ fullName: '', username: '', password: '', role: 'WORKER' }); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const valid = f.fullName.trim() && /^[A-Za-z0-9._-]{3,50}$/.test(f.username.trim()) && f.password.length >= 8
  return (
    <Sheet open={open} onClose={onClose} title="Add team member"
      footer={<Button block size="lg" loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Create account</Button>}>
      <Field label="Full name"><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoFocus /></Field>
      <Field label="Username" hint="3-50 characters: letters, digits, dot, dash, underscore"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoCapitalize="none" autoCorrect="off" /></Field>
      <Field label="Password" hint="At least 8 characters. Share it with the worker personally."><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" /></Field>
      <Field label="Role">
        <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          <option value="WORKER">Worker – billing counter only</option>
          <option value="OWNER">Owner – full access</option>
        </Select>
      </Field>
    </Sheet>
  )
}

function ResetPassword({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const save = useMutation({
    mutationFn: () => api.resetUserPassword(user!.id, pw),
    onSuccess: () => { toast.success('Password changed. The user was logged out everywhere.'); setPw(''); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <Sheet open={!!user} onClose={onClose} title={`Reset password · ${user?.fullName ?? ''}`}
      footer={<Button block size="lg" loading={save.isPending} disabled={pw.length < 8} onClick={() => save.mutate()}>Set new password</Button>}>
      <Field label="New password" hint="At least 8 characters"><Input value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" autoFocus /></Field>
    </Sheet>
  )
}
