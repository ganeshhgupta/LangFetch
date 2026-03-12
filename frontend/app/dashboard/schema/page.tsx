'use client'

import { useState } from 'react'
import { SCHEMAS, type Schema, type Table } from '@/lib/schemas'

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

function SchemaDropdown({ selected, onChange }: { selected: Schema; onChange: (s: Schema) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span>{selected.icon}</span>
        <span>{selected.name}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {SCHEMAS.map(s => (
            <button key={s.id} onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 ${s.id === selected.id ? 'bg-blue-50' : ''}`}>
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-400">{s.tables.length} tables</p>
              </div>
              {s.id === selected.id && (
                <svg className="ml-auto" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SchemaPage() {
  const [schema, setSchema] = useState<Schema>(SCHEMAS[0])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>([SCHEMAS[0].tables[0]?.name ?? ''])
  const [selected, setSelected] = useState<Table | null>(SCHEMAS[0].tables[0] ?? null)

  const handleSchemaChange = (s: Schema) => {
    setSchema(s)
    setExpanded([s.tables[0]?.name ?? ''])
    setSelected(s.tables[0] ?? null)
    setSearch('')
  }

  const filtered = schema.tables.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (name: string) =>
    setExpanded(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])

  const sampleRows = selected?.sampleData ?? []
  const sampleCols = selected ? selected.columns.map(c => c.name) : []

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left: Schema tree */}
      <div className="w-[240px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Header with schema selector */}
        <div className="px-3 py-3 border-b border-gray-100 space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Schema Explorer</h2>
          <SchemaDropdown selected={schema} onChange={handleSchemaChange} />
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tables, columns..."
              className="bg-transparent text-xs outline-none flex-1 text-gray-600 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map(table => {
            const isExpanded = expanded.includes(table.name)
            const isSelected = selected?.name === table.name
            return (
              <div key={table.name}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  onClick={() => { setSelected(table); if (!isExpanded) toggle(table.name) }}
                >
                  <button onClick={e => { e.stopPropagation(); toggle(table.name) }} className="text-gray-400 w-4 flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#1A73E8' : '#6b7280'} strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
                  </svg>
                  <span className={`text-sm flex-1 truncate ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    {table.name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {fmtCount(table.rows)}
                  </span>
                </div>

                {isExpanded && (
                  <div className="pl-9 pr-2 pb-1">
                    {table.columns.map(col => (
                      <div key={col.name} className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-gray-50 rounded cursor-default">
                        {col.isPK
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FBBC04" strokeWidth="2.5"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M10.5 10L21 3"/><path d="M17 7l2 2"/></svg>
                          : col.isFK
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2.5"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M10.5 10L21 3"/></svg>
                          : <div className="w-2.5 h-2.5 rounded-sm border border-gray-200 flex-shrink-0"/>
                        }
                        <span className="text-xs text-gray-600 flex-1">{col.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{col.type.split('(')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Table detail */}
      <div className="flex-1 overflow-y-auto bg-white">
        {selected ? (
          <div className="p-6 max-w-4xl">
            {/* Table header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
                <h1 className="text-xl font-semibold text-gray-900">{selected.name}</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500">
                  {schema.icon} {schema.name}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {fmtCount(selected.rows)} rows · {selected.columns.length} columns
            </p>

            {/* Columns table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Columns</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Name</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Type</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Key</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Nullable</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.columns.map((col, i) => (
                    <tr key={col.name} className={`border-t border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium">{col.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 font-mono text-xs">{col.type}</td>
                      <td className="px-5 py-3">
                        {col.isPK && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold text-amber-700" style={{ backgroundColor: '#FEF3C7' }}>PK</span>
                        )}
                        {col.isFK && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium text-blue-700 bg-blue-50">FK</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {col.nullable === false ? <span className="text-red-400">NOT NULL</span> : 'nullable'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sample Data */}
            {sampleRows.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
                  </svg>
                  <h2 className="text-sm font-semibold text-gray-700">Sample Data</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        {sampleCols.map(c => (
                          <th key={c} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {sampleCols.map(c => (
                            <td key={c} className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                              {row[c] !== undefined && row[c] !== null ? String(row[c]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sample Queries for this table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Sample Queries</h2>
                <span className="text-xs text-gray-400">{schema.queries.length} queries available</span>
              </div>
              <div className="divide-y divide-gray-50">
                {schema.queries.map((q, i) => (
                  <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-1">{q.label}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{q.explanation}</p>
                      </div>
                      <a href="/dashboard" className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium transition-colors" style={{ backgroundColor: '#1A73E8' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Run
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a table to view details
          </div>
        )}
      </div>
    </div>
  )
}
