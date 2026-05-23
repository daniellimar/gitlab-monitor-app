/** Formata valores da API GitLab para exibição legível. */
export function formatApiValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'sim' : 'não'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString('pt-BR')
      } catch {
        return value
      }
    }
    return value
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return value.map((v) => formatApiValue(v)).join(', ')
    }
    return `[${value.length} itens]`
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value as object).length} campos}`
  }
  return String(value)
}

export interface ApiDataRow {
  key: string
  value: string
  raw: unknown
}

const SKIP_KEYS = new Set(['avatar_url', 'org_avatar_url'])

/** Achata objeto JSON da API em linhas chave/valor. */
export function flattenApiObject(
  obj: unknown,
  prefix = '',
  depth = 0,
  maxDepth = 5
): ApiDataRow[] {
  const rows: ApiDataRow[] = []

  function walk(value: unknown, path: string, d: number) {
    if (d > maxDepth) {
      rows.push({ key: path, value: formatApiValue(value), raw: value })
      return
    }

    if (value === null || value === undefined) {
      if (path) rows.push({ key: path, value: '—', raw: value })
      return
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        rows.push({ key: path, value: '[]', raw: value })
        return
      }
      const allPrimitive = value.every(
        (v) => v === null || typeof v !== 'object'
      )
      if (allPrimitive) {
        rows.push({ key: path, value: formatApiValue(value), raw: value })
        return
      }
      value.forEach((item, i) => {
        walk(item, `${path}[${i}]`, d + 1)
      })
      return
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      const keys = Object.keys(record)
      if (keys.length === 0) {
        rows.push({ key: path, value: '{}', raw: value })
        return
      }
      for (const key of keys.sort()) {
        if (SKIP_KEYS.has(key) && typeof record[key] === 'string' && (record[key] as string).startsWith('http')) {
          rows.push({
            key: path ? `${path}.${key}` : key,
            value: '[URL]',
            raw: record[key],
          })
          continue
        }
        const childPath = path ? `${path}.${key}` : key
        const child = record[key]
        if (
          child !== null &&
          typeof child === 'object' &&
          !Array.isArray(child) &&
          d < maxDepth
        ) {
          walk(child, childPath, d + 1)
        } else if (Array.isArray(child) && child.length > 0 && typeof child[0] === 'object') {
          walk(child, childPath, d + 1)
        } else {
          rows.push({
            key: childPath,
            value: formatApiValue(child),
            raw: child,
          })
        }
      }
      return
    }

    rows.push({ key: path, value: formatApiValue(value), raw: value })
  }

  walk(obj, prefix, depth)
  return rows.filter((r) => r.key)
}

export function toApiRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  return { value: data }
}

export function mergeApiRecords(
  ...sources: (Record<string, unknown> | null | undefined)[]
): Record<string, unknown> {
  return Object.assign({}, ...sources.filter(Boolean))
}
