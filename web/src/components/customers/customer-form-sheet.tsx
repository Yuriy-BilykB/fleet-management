import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { CheckboxField, TextAreaField, TextField } from '@/components/common/form'
import { customerSchema, type CustomerFormValues } from '@/lib/schemas'
import { customers, type CustomerBody } from '@/hooks/use-resources'
import type { Customer } from '@/types/api'

const EMPTY: CustomerFormValues = {
  name: '', taxId: null, contactPerson: null, phone: null,
  email: null, address: null, notes: null, isActive: true,
}

function toFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name, taxId: customer.taxId, contactPerson: customer.contactPerson,
    phone: customer.phone, email: customer.email, address: customer.address,
    notes: customer.notes, isActive: customer.isActive,
  }
}

export function CustomerFormSheet({
  open, onOpenChange, customer, companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  companyId: string
}) {
  const create = customers.useCreate()
  const update = customers.useUpdate()
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) form.reset(customer ? toFormValues(customer) : EMPTY)
  }, [open, customer, form])

  const submit = form.handleSubmit((values) => {
    const body: CustomerBody = { ...values, companyId }
    const done = { onSuccess: () => onOpenChange(false) }
    if (customer) update.mutate({ id: customer.id, body }, done)
    else create.mutate(body, done)
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={customer ? `Edit ${customer.name}` : 'New customer'}
      onSubmit={submit}
      isPending={create.isPending || update.isPending}
    >
      <TextField control={form.control} name="name" label="Name" className="col-span-2" />
      <TextField control={form.control} name="taxId" label="Tax ID" />
      <TextField control={form.control} name="contactPerson" label="Contact person" />
      <TextField control={form.control} name="phone" label="Phone" />
      <TextField control={form.control} name="email" label="Email" type="email" />
      <TextField control={form.control} name="address" label="Address" className="col-span-2" />
      <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
      <CheckboxField control={form.control} name="isActive" label="Active" className="col-span-2" />
    </ResourceSheet>
  )
}
