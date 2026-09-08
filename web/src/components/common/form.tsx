import type { ReactNode } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { humanize } from '@/lib/format'

/** Sentinel for "no selection" — Base UI Select cannot hold an empty string value. */
const NONE = '__none__'

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: string
  placeholder?: string
  className?: string
}

function Field({
  label, error, description, children, className,
}: {
  label: string
  error?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive mt-1 text-xs">{error}</p>
      ) : description ? (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      ) : null}
    </div>
  )
}

export function TextField<T extends FieldValues>({
  control, name, label, placeholder, description, className, type = 'text',
}: BaseProps<T> & { type?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message} description={description} className={className}>
          <Input
            {...field}
            type={type}
            placeholder={placeholder}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
          />
        </Field>
      )}
    />
  )
}

export function NumberField<T extends FieldValues>({
  control, name, label, placeholder, description, className, step = 'any',
}: BaseProps<T> & { step?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message} description={description} className={className}>
          <Input
            {...field}
            type="number"
            step={step}
            placeholder={placeholder}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
          />
        </Field>
      )}
    />
  )
}

export function TextAreaField<T extends FieldValues>({
  control, name, label, placeholder, description, className,
}: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message} description={description} className={className}>
          <Textarea
            {...field}
            rows={3}
            placeholder={placeholder}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
          />
        </Field>
      )}
    />
  )
}

export function DateField<T extends FieldValues>({
  control, name, label, description, className, withTime = false,
}: BaseProps<T> & { withTime?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message} description={description} className={className}>
          <Input
            {...field}
            type={withTime ? 'datetime-local' : 'date'}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
          />
        </Field>
      )}
    />
  )
}

export interface Option {
  value: string
  label: string
}

export function SelectField<T extends FieldValues>({
  control, name, label, description, className, options, placeholder = 'Select…', allowEmpty = false,
}: BaseProps<T> & { options: readonly Option[] | readonly string[]; allowEmpty?: boolean }) {
  const items: Option[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: humanize(o) } : o,
  )
  const withEmpty: Option[] = allowEmpty ? [{ value: NONE, label: '— none —' }, ...items] : items

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message} description={description} className={className}>
          <Select
            items={withEmpty}
            value={field.value ?? (allowEmpty ? NONE : null)}
            onValueChange={(value) => field.onChange(value === NONE ? null : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {withEmpty.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  )
}

export function CheckboxField<T extends FieldValues>({
  control, name, label, description, className,
}: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className={`flex items-center gap-2 ${className ?? ''}`}>
          <Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          <span className="text-sm font-medium">{label}</span>
          {description && <span className="text-muted-foreground text-xs">{description}</span>}
        </label>
      )}
    />
  )
}
