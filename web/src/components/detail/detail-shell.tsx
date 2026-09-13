import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Building blocks for entity detail pages, following the FleetOps detail-page
 * design: breadcrumb → header card with a metric strip → tabs → content + rail.
 * Colours come from the theme tokens so the layout works in light and dark.
 */

export function DetailBreadcrumb({
  section, to, code,
}: {
  section: string
  to: string
  code: string
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 font-mono text-[12.5px]">
      <Link to={to} className="hover:text-foreground transition-colors">
        {section}
      </Link>
      <span>/</span>
      <span className="text-foreground/70">{code}</span>
    </div>
  )
}

export interface MetaItem {
  label: string
  value: ReactNode
}

export interface Metric {
  label: string
  value: ReactNode
  sub?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}

const METRIC_TONE: Record<string, string> = {
  default: 'text-foreground',
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
}

export function DetailHeader({
  glyph, title, status, meta, actions, metrics,
}: {
  glyph: string
  title: string
  status?: ReactNode
  meta: MetaItem[]
  actions?: ReactNode
  metrics: Metric[]
}) {
  return (
    <header className="bg-card overflow-hidden rounded-[14px] border">
      <div className="flex flex-wrap items-start gap-6 px-6 pt-[22px] pb-5">
        <div className="flex min-w-0 flex-1 gap-[18px]">
          <div className="bg-muted text-muted-foreground flex size-[52px] shrink-0 items-center justify-center rounded-xl border font-mono text-[15px]">
            {glyph}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{title}</h1>
              {status}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
              {meta.map((item) => (
                <span key={item.label} className="flex items-center gap-2">
                  <span className="opacity-70">{item.label}</span>
                  <span className="text-foreground/85">{item.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="bg-muted/30 grid grid-cols-[repeat(auto-fit,minmax(168px,1fr))] border-t">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-[5px] border-r px-5 py-3.5 last:border-r-0">
            <span className="text-muted-foreground text-[10.5px] font-medium tracking-[0.08em] uppercase">
              {metric.label}
            </span>
            <span
              className={cn(
                'font-mono text-[19px] font-semibold tracking-[-0.01em]',
                METRIC_TONE[metric.tone ?? 'default'],
              )}
            >
              {metric.value}
            </span>
            {metric.sub && <span className="text-muted-foreground text-[11.5px]">{metric.sub}</span>}
          </div>
        ))}
      </div>
    </header>
  )
}

export interface DetailTab {
  id: string
  label: string
  count?: number
}

export function DetailTabs({
  tabs, value, onChange,
}: {
  tabs: DetailTab[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="bg-muted text-muted-foreground rounded-[5px] px-1.5 py-px font-mono text-[11px]">
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function DetailLayout({ main, rail }: { main: ReactNode; rail?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">{main}</div>
      {rail && <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">{rail}</div>}
    </div>
  )
}

export function Section({
  title, action, children, className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('bg-card overflow-hidden rounded-xl border', className)}>
      <div className="flex items-center justify-between border-b px-[18px] py-[13px]">
        <h2 className="text-[13px] font-semibold tracking-[0.01em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export interface Field {
  label: string
  value: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
}

export function FieldGrid({ fields }: { fields: Field[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
      {fields.map((field) => (
        <div
          key={field.label}
          className="border-border/60 flex min-w-0 flex-col gap-[3px] border-r border-b px-[18px] py-[9px]"
        >
          <span className="text-muted-foreground text-[11px] tracking-[0.05em] uppercase">
            {field.label}
          </span>
          <span className={cn('text-[13.5px]', METRIC_TONE[field.tone ?? 'default'])}>
            {field.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export interface ActivityItem {
  id: string
  time: string
  title: string
  description?: string
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'info'
}

const DOT_TONE: Record<string, string> = {
  default: 'bg-muted-foreground/50',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  info: 'bg-sky-500',
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground px-[18px] py-8 text-center text-sm">No activity yet.</p>
  }

  return (
    <div className="px-[18px] pt-1.5 pb-3.5">
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[96px_14px_minmax(0,1fr)] items-start gap-3 py-[11px]">
          <span className="text-muted-foreground pt-px font-mono text-[12px]">{item.time}</span>
          <span className={cn('mt-1.5 size-[7px] rounded-full', DOT_TONE[item.tone ?? 'default'])} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px]">{item.title}</span>
            {item.description && (
              <span className="text-muted-foreground text-[12.5px]">{item.description}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export interface RailItem {
  label: string
  value: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'
}

export function RailCard({
  title, hint, items,
}: {
  title: string
  hint?: string
  items: RailItem[]
}) {
  return (
    <section className="bg-card overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-[12.5px] font-semibold">{title}</h3>
        {hint && <span className="text-muted-foreground text-[12px]">{hint}</span>}
      </div>
      <div className="flex flex-col">
        {items.map((item) => (
          <div
            key={item.label}
            className="border-border/60 flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
          >
            <span className="text-muted-foreground min-w-0 text-[12.5px]">{item.label}</span>
            <span className={cn('text-right text-[12.5px]', METRIC_TONE[item.tone ?? 'default'])}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
