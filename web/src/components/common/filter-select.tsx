import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { humanize } from '@/lib/format'

const ALL = '__all__'

export function FilterSelect({
  value, onChange, options, placeholder, allLabel = 'All', className = 'w-[170px]',
}: {
  value: string | null
  onChange: (value: string | null) => void
  options: readonly string[] | readonly { value: string; label: string }[]
  placeholder: string
  allLabel?: string
  className?: string
}) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: humanize(o) } : o))
  const withAll = [{ value: ALL, label: allLabel }, ...items]

  return (
    <Select
      items={withAll}
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? null : (next as string))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {withAll.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
