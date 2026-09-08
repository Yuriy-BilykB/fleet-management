import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { formatMoney } from '@/lib/format'

const AXIS = 'var(--viz-axis)'
const GRID = 'var(--viz-grid)'

export function ChartCard({
  title, description, children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function TooltipBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  )
}

export interface CategoryDatum {
  label: string
  value: number
  color: string
}

/**
 * Horizontal bars for a count per category. The category sits on the axis and
 * the value is printed at the end of each bar, so the reading never depends on
 * colour — which also satisfies the light-mode contrast relief rule.
 */
export function CategoryBars({ data, unit = '' }: { data: CategoryDatum[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 16}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={104}
          tickLine={false}
          axisLine={false}
          tick={{ fill: AXIS, fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: GRID, fillOpacity: 0.4 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={String(payload[0].payload.label)}
                value={`${payload[0].value}${unit}`}
              />
            ) : null
          }
        />
        <Bar dataKey="value" radius={4} barSize={18} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
            fontWeight={500}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface TrendDatum {
  label: string
  value: number
}

/** A single measure over time — one series, so no legend; the title names it. */
export function SpendTrend({ data, currency }: { data: TrendDatum[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--viz-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: AXIS, fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: AXIS, fontSize: 12 }}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <Tooltip
          cursor={{ stroke: GRID, strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={String(payload[0].payload.label)}
                value={formatMoney(Number(payload[0].value), currency)}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--viz-1)"
          strokeWidth={2}
          fill="url(#spend-fill)"
          dot={{ r: 3, fill: 'var(--viz-1)', strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: 'var(--background)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
