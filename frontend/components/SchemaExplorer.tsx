'use client'

import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

interface Column {
  name: string
  type: string
  nullable: boolean
  primary_key: boolean
  foreign_key?: string
}

interface Table {
  name: string
  description: string
  row_count: number
  columns: Column[]
}

export default function SchemaExplorer() {
  const [tables, setTables] = useState<Table[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/schema`)
      .then(r => r.json())
      .then(d => {
        setTables(d.tables)
        setExpanded([d.tables[0]?.name])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (name: string) => {
    setExpanded(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tables and columns..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Tables */}
      <div className="space-y-2">
        {filtered.map(table => (
          <div key={table.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Table header */}
            <button
              onClick={() => toggle(table.name)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <span className="text-lg">🗃️</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 font-mono">{table.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {table.row_count.toLocaleString()} rows
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{table.description}</p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expanded.includes(table.name) ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Columns */}
            {expanded.includes(table.name) && (
              <div className="border-t border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-850">
                      <th className="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Column</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map(col => (
                      <tr key={col.name} className="border-t border-gray-50 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            {col.primary_key && <span title="Primary Key">🔑</span>}
                            {col.foreign_key && <span title={`→ ${col.foreign_key}`}>🔗</span>}
                            <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{col.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400">{col.type}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500">
                          {col.primary_key && <span className="mr-1 px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">PK</span>}
                          {col.foreign_key && <span className="mr-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">FK → {col.foreign_key}</span>}
                          {!col.nullable && !col.primary_key && <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">NOT NULL</span>}
                          {col.nullable && <span className="text-gray-300 dark:text-gray-600">nullable</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
