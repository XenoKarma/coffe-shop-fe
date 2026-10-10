import { useEffect, useState } from "react"

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

function writeSession<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage penuh/di-block: state tetap jalan, hanya tidak persist
  }
}

export function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readSession(key) ?? fallback)

  useEffect(() => {
    writeSession(key, value)
  }, [key, value])

  return [value, setValue] as const
}
