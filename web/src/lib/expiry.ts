export type Tone = 'default' | 'good' | 'warn' | 'bad'

/** Days until a date; negative once it has passed, null when unset. */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
}

/** Amber inside 30 days, red once expired — the same window the dashboard uses. */
export function expiryTone(days: number | null): Tone {
  if (days === null) return 'default'
  if (days < 0) return 'bad'
  if (days <= 30) return 'warn'
  return 'default'
}

export function expiryNote(days: number | null): string {
  if (days === null) return 'not set'
  if (days < 0) return `expired ${Math.abs(days)} days ago`
  if (days <= 30) return `expires in ${days} days`
  return 'valid'
}
