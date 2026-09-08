import { Building2 } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCompany } from '@/hooks/use-company'

export function CompanySwitcher() {
  const { companyId, list, selectCompany, isLoading } = useCompany()

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading companies…</p>
  }

  if (list.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No companies yet — create one on the Companies page to get started.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="text-muted-foreground size-4" />
      <Select
        items={list.map((c) => ({ value: c.id, label: c.name }))}
        value={companyId}
        onValueChange={(value) => value && selectCompany(value)}
      >
        <SelectTrigger size="sm" className="w-[240px]">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {list.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
