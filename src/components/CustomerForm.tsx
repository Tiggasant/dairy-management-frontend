import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, errorMessage } from '@/lib/api'
import type { Customer } from '@/lib/types'
import { Button, Field, Input, Sheet } from './ui'

/** Add or edit a customer. Used by the billing screen and the customers screen. */
export default function CustomerForm({ open, onClose, customer, onSaved }: {
  open: boolean
  onClose: () => void
  customer?: Customer | null
  onSaved?: (c: Customer) => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (open) { setName(customer?.name ?? ''); setPhone(customer?.phone ?? '') }
  }, [open, customer])

  const save = useMutation({
    mutationFn: () => customer ? api.updateCustomer(customer.id, name.trim(), phone.trim()) : api.createCustomer(name.trim(), phone.trim()),
    onSuccess: (c) => {
      toast.success(customer ? 'Customer updated' : 'Customer added')
      qc.invalidateQueries({ queryKey: ['customers'] })
      onSaved?.(c)
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Sheet open={open} onClose={onClose} title={customer ? 'Edit customer' : 'New customer'}
      footer={<Button block size="lg" loading={save.isPending} disabled={!name.trim()} onClick={() => save.mutate()}>Save</Button>}>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" autoFocus /></Field>
      <Field label="Phone (optional)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" maxLength={15} /></Field>
    </Sheet>
  )
}
