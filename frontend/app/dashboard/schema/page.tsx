'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SCHEMAS, type Schema, type Table, type QueryLogEntry } from '@/lib/schemas'
import { getQueryLog } from '@/lib/queryLog'

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function QueryLog({ entries }: { entries: QueryLogEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (entries.length === 0)
    return <p className="text-xs text-gray-400 px-6 py-4">No queries logged yet.</p>
  return (
    <div className="divide-y divide-gray-50">
      {entries.map(e => (
        <div key={e.id} className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
          <div className="flex items-center gap-2.5 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
              e.type === 'llm'
                ? 'bg-purple-50 text-purple-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {e.type === 'llm'
                ? <><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>LLM</>
                : <><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>SQL</>
              }
            </span>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}/>
            <span className="text-xs font-mono text-gray-700 truncate flex-1">
              {e.prompt ?? e.sql.split('\n')[0].slice(0, 70)}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">{e.duration_ms}ms</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(e.timestamp)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`text-gray-400 transition-transform flex-shrink-0 ${expanded === e.id ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          {e.prompt && (
            <p className="text-xs text-gray-500 pl-14 truncate">{e.sql.split('\n')[0].slice(0, 80)}</p>
          )}
          {expanded === e.id && (
            <pre className="mt-2 ml-14 text-xs font-mono bg-gray-950 text-green-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {e.sql}
            </pre>
          )}
        </div>
      ))}
    </div>
  )
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
          {/* New Schema button */}
          <Link href="/dashboard/schema/new"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-t border-gray-100 hover:bg-gray-50 transition-colors">
            <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8F0FE' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
            <span className="text-sm font-medium" style={{ color: '#1A73E8' }}>New Schema...</span>
          </Link>
        </div>
      )}
    </div>
  )
}

const TABLE_W = 200
const HEADER_H = 36
const ROW_H = 26
const GAP_X = 100
const GAP_Y = 50
const MARGIN = 40

function computeERDLayout(tables: Table[]): Record<string, { x: number; y: number }> {
  const COLS = 2
  const positions: Record<string, { x: number; y: number }> = {}
  for (let i = 0; i < tables.length; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    let y = MARGIN
    for (let r = 0; r < row; r++) {
      const rowTables = tables.slice(r * COLS, (r + 1) * COLS)
      const maxH = Math.max(...rowTables.map(t => HEADER_H + t.columns.length * ROW_H))
      y += maxH + GAP_Y
    }
    positions[tables[i].name] = { x: MARGIN + col * (TABLE_W + GAP_X), y }
  }
  return positions
}

function inferFKRels(schema: Schema): Array<{ fromTable: string; fromColIdx: number; toTable: string }> {
  const rels: Array<{ fromTable: string; fromColIdx: number; toTable: string }> = []
  const tableNames = schema.tables.map(t => t.name)
  for (const table of schema.tables) {
    table.columns.forEach((col, colIdx) => {
      if (!col.isFK) return
      const prefix = col.name.replace(/_id$/, '')
      const target = tableNames.find(
        n => n === prefix || n === prefix + 's' || n === prefix + 'es' || n.startsWith(prefix)
      )
      if (target && target !== table.name) {
        rels.push({ fromTable: table.name, fromColIdx: colIdx, toTable: target })
      }
    })
  }
  return rels
}

function ERDDiagram({ schema }: { schema: Schema }) {
  const positions = computeERDLayout(schema.tables)
  const fkRels = inferFKRels(schema)
  const COLS = 2

  const rows = Math.ceil(schema.tables.length / COLS)
  let svgH = MARGIN
  for (let r = 0; r < rows; r++) {
    const rowTables = schema.tables.slice(r * COLS, (r + 1) * COLS)
    const maxH = Math.max(...rowTables.map(t => HEADER_H + t.columns.length * ROW_H))
    svgH += maxH + (r < rows - 1 ? GAP_Y : 0)
  }
  svgH += MARGIN

  const svgW = MARGIN * 2 + COLS * TABLE_W + (COLS - 1) * GAP_X + 40

  function arrowPath(fromTable: string, fromColIdx: number, toTable: string): string {
    const fp = positions[fromTable]
    const tp = positions[toTable]
    if (!fp || !tp) return ''
    const y1 = fp.y + HEADER_H + (fromColIdx + 0.5) * ROW_H
    const y2 = tp.y + HEADER_H / 2
    let x1: number, x2: number, cx1: number, cx2: number
    if (fp.x !== tp.x) {
      if (fp.x < tp.x) {
        x1 = fp.x + TABLE_W; x2 = tp.x
      } else {
        x1 = fp.x; x2 = tp.x + TABLE_W
      }
      cx1 = (x1 + x2) / 2; cx2 = (x1 + x2) / 2
    } else {
      // same column — route to outside
      const outside = fp.x === MARGIN ? fp.x - 50 : fp.x + TABLE_W + 50
      x1 = fp.x < svgW / 2 ? fp.x : fp.x + TABLE_W
      x2 = x1
      return `M${x1},${y1} C${outside},${y1} ${outside},${y2} ${x2},${y2}`
    }
    return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`
  }

  return (
    <div className="overflow-auto bg-gray-50 rounded-xl border border-gray-200">
      <svg width={svgW} height={svgH} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="erd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#1A73E8" opacity="0.7" />
          </marker>
        </defs>

        {/* FK relation lines */}
        {fkRels.map((rel, i) => (
          <path
            key={i}
            d={arrowPath(rel.fromTable, rel.fromColIdx, rel.toTable)}
            fill="none"
            stroke="#1A73E8"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            markerEnd="url(#erd-arrow)"
            opacity="0.55"
          />
        ))}

        {/* Table boxes */}
        {schema.tables.map(table => {
          const pos = positions[table.name]
          if (!pos) return null
          const tableH = HEADER_H + table.columns.length * ROW_H
          return (
            <g key={table.name} transform={`translate(${pos.x},${pos.y})`}>
              {/* Drop shadow */}
              <rect x={3} y={3} width={TABLE_W} height={tableH} rx={8} fill="rgba(0,0,0,0.07)" />
              {/* Box */}
              <rect width={TABLE_W} height={tableH} rx={8} fill="white" stroke="#e5e7eb" strokeWidth={1} />
              {/* Header */}
              <rect width={TABLE_W} height={HEADER_H} rx={8} fill="#1A73E8" />
              <rect y={HEADER_H - 8} width={TABLE_W} height={8} fill="#1A73E8" />
              <text
                x={TABLE_W / 2} y={HEADER_H / 2 + 5}
                textAnchor="middle" fill="white" fontSize={12} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {table.name}
              </text>
              {/* Columns */}
              {table.columns.map((col, j) => {
                const rowY = HEADER_H + j * ROW_H
                const isLast = j === table.columns.length - 1
                return (
                  <g key={col.name}>
                    <rect
                      y={rowY} width={TABLE_W} height={ROW_H}
                      fill={j % 2 === 0 ? 'white' : '#f9fafb'}
                      rx={isLast ? 0 : 0}
                    />
                    {isLast && (
                      <rect y={rowY + ROW_H - 8} width={TABLE_W} height={8} rx={8}
                        fill={j % 2 === 0 ? 'white' : '#f9fafb'} />
                    )}
                    {col.isPK && (
                      <circle cx={12} cy={rowY + ROW_H / 2} r={5} fill="#FBBC04" />
                    )}
                    {col.isFK && !col.isPK && (
                      <circle cx={12} cy={rowY + ROW_H / 2} r={5} fill="#1A73E8" opacity={0.6} />
                    )}
                    <text
                      x={col.isPK || col.isFK ? 24 : 10}
                      y={rowY + ROW_H / 2 + 4}
                      fontSize={11} fill="#374151"
                      fontFamily="ui-monospace, monospace"
                    >
                      {col.name}
                    </text>
                    <text
                      x={TABLE_W - 8} y={rowY + ROW_H / 2 + 4}
                      textAnchor="end" fontSize={9} fill="#9ca3af"
                      fontFamily="ui-monospace, monospace"
                    >
                      {col.type.split('(')[0]
                        .replace('TIMESTAMPTZ', 'TSTZ')
                        .replace('BIGSERIAL', 'BIGSER')
                        .replace('VARCHAR', 'VAR')
                        .replace('INTEGER', 'INT')
                        .replace('BOOLEAN', 'BOOL')
                        .replace('NUMERIC', 'NUM')
                        .replace('SMALLINT', 'SINT')
                      }
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${svgW - 140}, ${svgH - 54})`}>
          <rect width={130} height={46} rx={6} fill="white" stroke="#e5e7eb" strokeWidth={1} />
          <circle cx={16} cy={15} r={5} fill="#FBBC04" />
          <text x={26} y={19} fontSize={10} fill="#6b7280" fontFamily="sans-serif">Primary Key</text>
          <circle cx={16} cy={33} r={5} fill="#1A73E8" opacity={0.6} />
          <text x={26} y={37} fontSize={10} fill="#6b7280" fontFamily="sans-serif">Foreign Key</text>
        </g>
      </svg>
    </div>
  )
}

export default function SchemaPage() {
  const [schema, setSchema] = useState<Schema>(SCHEMAS[0])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>([SCHEMAS[0].tables[0]?.name ?? ''])
  const [selected, setSelected] = useState<Table | null>(SCHEMAS[0].tables[0] ?? null)
  const [tab, setTab] = useState<'tables' | 'diagram' | 'log'>('tables')
  const [liveQueryLog, setLiveQueryLog] = useState<QueryLogEntry[]>([])

  useEffect(() => {
    setLiveQueryLog(getQueryLog(schema.id))
  }, [schema.id, tab])

  const handleSchemaChange = (s: Schema) => {
    setSchema(s)
    setExpanded([s.tables[0]?.name ?? ''])
    setSelected(s.tables[0] ?? null)
    setSearch('')
    setTab('tables')
    setLiveQueryLog(getQueryLog(s.id))
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
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-gray-200 px-6 pt-0 flex-shrink-0">
          {(['tables', 'diagram', 'log'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'log' ? (
                <span className="flex items-center gap-1.5">
                  Query Log
                  {liveQueryLog.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full font-semibold" style={{ backgroundColor: '#E8F0FE', color: '#1A73E8' }}>
                      {liveQueryLog.length}
                    </span>
                  )}
                </span>
              ) : t === 'diagram' ? 'Diagram' : 'Tables'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
        {tab === 'log' ? (
          <QueryLog entries={liveQueryLog} />
        ) : tab === 'diagram' ? (
          <div className="p-6 overflow-auto flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Entity Relationship Diagram</h2>
                <p className="text-xs text-gray-400 mt-0.5">{schema.icon} {schema.name} — {schema.tables.length} tables</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-8 border-t-2 border-dashed border-blue-400 opacity-60" />
                  FK relationship
                </span>
              </div>
            </div>
            <ERDDiagram schema={schema} />
          </div>
        ) : selected ? (
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
    </div>
  )
}
