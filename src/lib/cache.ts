interface CacheEntry {
  value: unknown
  storedAt: number
}

const entries = new Map<string, CacheEntry>()

const DEFAULT_MAX_AGE_MS = 30_000

export function peekCache<T>(key: string): T | null {
  const entry = entries.get(key)
  return entry ? (entry.value as T) : null
}

export function isCacheFresh(key: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS): boolean {
  const entry = entries.get(key)
  return entry !== undefined && Date.now() - entry.storedAt <= maxAgeMs
}

export function writeCache<T>(key: string, value: T): void {
  entries.set(key, { value, storedAt: Date.now() })
}
