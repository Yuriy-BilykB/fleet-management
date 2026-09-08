import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { humanize } from '@/lib/format'

/**
 * Status colors are reserved for state and never reused as chart series colors.
 * Every badge carries its label, so state is never signalled by color alone.
 */
const TONES: Record<string, string> = {
  // neutral / not started
  Draft: 'bg-muted text-muted-foreground border-transparent',
  Planned: 'bg-muted text-muted-foreground border-transparent',
  Inactive: 'bg-muted text-muted-foreground border-transparent',
  Decommissioned: 'bg-muted text-muted-foreground border-transparent',
  // good / ready
  Available: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent',
  Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent',
  Delivered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent',
  Completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent',
  // in progress
  OnTrip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent',
  InTransit: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent',
  InProgress: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent',
  Scheduled: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent',
  // needs attention
  InService: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent',
  OnLeave: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent',
  // stopped
  Cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300 border-transparent',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', TONES[status])}>
      {humanize(status)}
    </Badge>
  )
}
