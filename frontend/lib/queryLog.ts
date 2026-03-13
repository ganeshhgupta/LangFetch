import type { QueryLogEntry } from './schemas'

function storageKey(schemaId: string) {
  return `langfetch_qlog_${schemaId}`
}

export function getQueryLog(schemaId: string): QueryLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(storageKey(schemaId))
    return raw ? (JSON.parse(raw) as QueryLogEntry[]) : []
  } catch {
    return []
  }
}

export function addQueryLogEntry(
  schemaId: string,
  entry: Omit<QueryLogEntry, 'id' | 'timestamp'>
) {
  if (typeof window === 'undefined') return
  try {
    const full: QueryLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }
    const existing = getQueryLog(schemaId)
    const updated = [full, ...existing].slice(0, 100)
    sessionStorage.setItem(storageKey(schemaId), JSON.stringify(updated))
  } catch {}
}
