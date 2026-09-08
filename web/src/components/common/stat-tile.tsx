import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * A hero number: the value leads, the label names it, and the hint carries the
 * secondary breakdown. No chart — there is nothing to compare against here.
 */
export function StatTile({
  label, value, hint, icon: Icon, tone,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: 'default' | 'warning'
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <Icon
          className={
            tone === 'warning'
              ? 'size-4 shrink-0 text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground size-4 shrink-0'
          }
        />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </Card>
  )
}
