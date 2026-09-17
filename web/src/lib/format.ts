const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

export function formatMoney(value: number | null | undefined, currency = 'EUR'): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-GB').format(value) + suffix
}

/** Splits a PascalCase enum name into words: "InTransit" -> "In Transit". */
export function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

/** `<input type="date">` wants yyyy-MM-dd; the API returns that already for DateOnly. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

/** `<input type="datetime-local">` wants yyyy-MM-ddTHH:mm in local time. */
export function toDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Turns a datetime-local value back into an ISO instant for the API. */
export function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString()
}
