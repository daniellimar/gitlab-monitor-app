const ACCESS_LEVELS: Record<number, string> = {
  10: 'Guest',
  20: 'Reporter',
  30: 'Developer',
  40: 'Maintainer',
  50: 'Owner',
}

export function getAccessLevelLabel(level: number): string {
  return ACCESS_LEVELS[level] ?? `Nível ${level}`
}

export const ACCESS_LEVEL_OPTIONS = [
  { value: 'all', label: 'Todos os papéis' },
  { value: '10', label: 'Guest' },
  { value: '20', label: 'Reporter' },
  { value: '30', label: 'Developer' },
  { value: '40', label: 'Maintainer' },
  { value: '50', label: 'Owner' },
]
