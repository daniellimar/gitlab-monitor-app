export const COMMIT_PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último ano' },
] as const

export type CommitPeriodDays = 7 | 30 | 60 | 90 | 180 | 365

export const DEFAULT_COMMIT_PERIOD_DAYS: CommitPeriodDays = 30

export function parseCommitPeriodDays(value: string | number): CommitPeriodDays {
  const n = typeof value === 'string' ? parseInt(value, 10) : value
  const allowed = COMMIT_PERIOD_OPTIONS.map((o) => parseInt(o.value, 10))
  if (allowed.includes(n)) return n as CommitPeriodDays
  return DEFAULT_COMMIT_PERIOD_DAYS
}
