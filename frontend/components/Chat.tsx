'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SCHEMAS, type Schema, type SampleQuery } from '@/lib/schemas'
import { addQueryLogEntry } from '@/lib/queryLog'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

interface ThinkingStep {
  text: string
  done: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string
  explanation?: string
  tip?: string
  thinking?: ThinkingStep[]
  isStreaming?: boolean
}

const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS',
  'ON','AS','GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','DISTINCT','INTO',
  'INSERT','UPDATE','DELETE','CREATE','DROP','TABLE','INDEX','AND','OR','NOT',
  'IN','IS','NULL','LIKE','BETWEEN','UNION','ALL','INTERVAL','CASE','WHEN',
  'THEN','ELSE','END','WITH','DATE_TRUNC','NOW','COALESCE','COUNT','SUM',
  'AVG','MAX','MIN','NULLS','LAST','FIRST','OVER','PARTITION','ROW_NUMBER',
  'RANK','DENSE_RANK','LAG','LEAD','CAST','CONVERT','EXTRACT','DATE_PART',
  'QUALIFY','FILTER','STDDEV','PERCENTILE_CONT','WITHIN','SPLIT_PART',
])

function highlightSQL(sql: string): React.ReactNode {
  type Token = { type: 'keyword' | 'string' | 'comment' | 'default'; text: string }
  const tokens: Token[] = []
  let i = 0
  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i; while (j < sql.length && sql[j] !== '\n') j++
      tokens.push({ type: 'comment', text: sql.slice(i, j) }); i = j; continue
    }
    if (sql[i] === "'") {
      let j = i + 1; while (j < sql.length && sql[j] !== "'") j++
      tokens.push({ type: 'string', text: sql.slice(i, j + 1) }); i = j + 1; continue
    }
    if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i + 1; while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++
      const word = sql.slice(i, j)
      tokens.push({ type: SQL_KEYWORDS.has(word.toUpperCase()) ? 'keyword' : 'default', text: word })
      i = j; continue
    }
    const last = tokens[tokens.length - 1]
    if (last?.type === 'default') { last.text += sql[i] } else { tokens.push({ type: 'default', text: sql[i] }) }
    i++
  }
  return tokens.map((t, idx) => {
    if (t.type === 'keyword') return <span key={idx} className="sql-keyword">{t.text}</span>
    if (t.type === 'string')  return <span key={idx} className="sql-string">{t.text}</span>
    if (t.type === 'comment') return <span key={idx} className="sql-comment">{t.text}</span>
    return <span key={idx}>{t.text}</span>
  })
}

interface QueryResult {
  columns: string[]
  rows: (string | number | null)[][]
  row_count: number
}

function ResultsTable({ result }: { result: QueryResult }) {
  if (result.row_count === 0) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50 rounded-b-xl border-t border-gray-100">
        Query returned 0 rows.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto border-t border-gray-200 bg-white rounded-b-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">
            {result.row_count} row{result.row_count !== 1 ? 's' : ''} returned
          </span>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {result.columns.map(col => (
              <th key={col} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">
                  {cell === null ? <span className="text-gray-300 italic">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SQLBlock({ sql, explanation, tip, schemaId }: {
  sql: string
  explanation?: string
  tip?: string
  schemaId: string
}) {
  const [copied, setCopied] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const copy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const runQuery = async () => {
    const start = Date.now()
    setRunning(true)
    setResult(null)
    setRunError(null)
    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, schema_id: schemaId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRunError(data.detail ?? 'Unknown error')
        addQueryLogEntry(schemaId, { type: 'sql', sql, duration_ms: Date.now() - start, rows: 0, status: 'error' })
      } else {
        setResult(data)
        addQueryLogEntry(schemaId, { type: 'sql', sql, duration_ms: Date.now() - start, rows: data.row_count, status: 'success' })
      }
    } catch {
      setRunError(`Could not reach backend at ${API_BASE}`)
      addQueryLogEntry(schemaId, { type: 'sql', sql, duration_ms: Date.now() - start, rows: 0, status: 'error' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-sm text-gray-500 font-medium">PostgreSQL</span>
        <button onClick={copy} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100">
          {copied
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          }
        </button>
      </div>

      <div className="overflow-x-auto bg-white">
        <pre className="sql-code">{highlightSQL(sql)}</pre>
      </div>

      {showExplanation && explanation && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-blue-800 leading-relaxed">{explanation}</p>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white">
        <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button onClick={() => setShowExplanation(!showExplanation)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Explain
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Optimize
        </button>
        <button
          onClick={runQuery}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium transition-all disabled:opacity-60"
          style={{ backgroundColor: '#1A73E8' }}
        >
          {running
            ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          }
          {running ? 'Running...' : 'Run Query'}
        </button>
      </div>

      {runError && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-xs text-red-700 leading-relaxed">
          <span className="font-semibold">Error: </span>{runError}
        </div>
      )}

      {result && <ResultsTable result={result} />}
    </div>
  )
}

function AgentSteps({ steps }: { steps: ThinkingStep[] }) {
  return (
    <div className="space-y-2 mb-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#34A853' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <span className="text-sm text-gray-600">{step.text.replace(/^[^\s]+\s/, '')}</span>
          {!step.done && (
            <span className="flex gap-0.5 ml-1">
              <span className="thinking-dot w-1 h-1 rounded-full bg-gray-400 inline-block" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-gray-400 inline-block" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-gray-400 inline-block" />
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// Schema selector dropdown
function SchemaSelector({ selected, onChange }: { selected: Schema; onChange: (s: Schema) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span className="text-base leading-none">{selected.icon}</span>
        <span>{selected.name}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {SCHEMAS.map(schema => (
            <button
              key={schema.id}
              onClick={() => { onChange(schema); setOpen(false) }}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${
                schema.id === selected.id ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-xl leading-none mt-0.5">{schema.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{schema.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{schema.description}</p>
              </div>
              {schema.id === selected.id && (
                <svg className="ml-auto flex-shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2.5">
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

// Query chips row
function QueryChips({ queries, onSelect }: { queries: SampleQuery[]; onSelect: (q: SampleQuery) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {queries.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all text-xs text-gray-600 font-medium whitespace-nowrap"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="5 12 12 5 19 12"/>
            <line x1="12" y1="19" x2="12" y2="5"/>
          </svg>
          {q.label}
        </button>
      ))}
    </div>
  )
}

interface ChatProps {
  onQuerySent?: (query: string) => void
  selectedSchema?: Schema
  onSchemaChange?: (schema: Schema) => void
}

export default function Chat({ onQuerySent, selectedSchema, onSchemaChange }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [internalSchema, setInternalSchema] = useState<Schema>(SCHEMAS[0])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeSchema = selectedSchema ?? internalSchema
  const handleSchemaChange = (s: Schema) => {
    setInternalSchema(s)
    onSchemaChange?.(s)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Restore chat history from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('langfetch_messages')
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        setMessages(parsed.map(m => ({ ...m, isStreaming: false })))
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist chat history to sessionStorage whenever messages change
  useEffect(() => {
    if (messages.length === 0) return
    try {
      sessionStorage.setItem(
        'langfetch_messages',
        JSON.stringify(messages.map(m => ({ ...m, isStreaming: false })))
      )
    } catch {}
  }, [messages])

  const injectDemoResponse = useCallback((query: SampleQuery, prompt: string) => {
    const userMsgId = Date.now().toString()
    const assistantMsgId = (Date.now() + 1).toString()
    const start = Date.now()

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: prompt },
      { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true, thinking: [] },
    ])
    onQuerySent?.(prompt)
    setIsLoading(true)

    const steps = [
      `Analyzing ${activeSchema.name} schema...`,
      'Identifying relevant tables and join paths...',
      'Generating optimized SQL query...',
    ]

    let stepIdx = 0
    const thinkingSteps: ThinkingStep[] = []

    const tick = () => {
      if (stepIdx < steps.length) {
        thinkingSteps.push({ text: steps[stepIdx], done: false })
        if (stepIdx > 0) thinkingSteps[stepIdx - 1].done = true
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId ? { ...m, thinking: [...thinkingSteps] } : m
        ))
        stepIdx++
        setTimeout(tick, 380)
      } else {
        const finalSteps = thinkingSteps.map(s => ({ ...s, done: true }))
        addQueryLogEntry(activeSchema.id, {
          type: 'llm',
          sql: query.sql,
          prompt,
          duration_ms: Date.now() - start,
          rows: 0,
          status: 'success',
        })
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, thinking: finalSteps, sql: query.sql, explanation: query.explanation, tip: query.tip, isStreaming: false }
            : m
        ))
        setIsLoading(false)
      }
    }
    setTimeout(tick, 200)
  }, [activeSchema, onQuerySent])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsgId = Date.now().toString()
    const assistantMsgId = (Date.now() + 1).toString()
    const start = Date.now()

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true, thinking: [] },
    ])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onQuerySent?.(text)
    setIsLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, schema: activeSchema.id }),
      })
      if (!response.body) throw new Error('No body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let steps: ThinkingStep[] = []
      let capturedSql = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const data = JSON.parse(raw)
            if (data.type === 'thinking') {
              steps = [...steps.map(s => ({ ...s, done: true })), { text: data.text, done: false }]
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, thinking: steps } : m))
            } else if (data.type === 'sql') {
              capturedSql = data.sql
              steps = steps.map(s => ({ ...s, done: true }))
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, thinking: steps, sql: data.sql } : m))
            } else if (data.type === 'explanation') {
              if (capturedSql) {
                addQueryLogEntry(activeSchema.id, {
                  type: 'llm',
                  sql: capturedSql,
                  prompt: text,
                  duration_ms: Date.now() - start,
                  rows: 0,
                  status: 'success',
                })
              }
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, explanation: data.text, isStreaming: false } : m))
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, content: `Could not reach backend at ${API_BASE}. Start the server: uvicorn app.main:app --reload --port 8000`, isStreaming: false }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, onQuerySent, activeSchema])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col flex-1 h-full bg-white overflow-hidden">
      {/* Top bar: schema selector */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Schema</span>
          <SchemaSelector selected={activeSchema} onChange={handleSchemaChange} />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34A853' }} />
          <span className="text-xs text-gray-400">{activeSchema.tables.length} tables · {activeSchema.tables.reduce((a, t) => a + t.rows, 0).toLocaleString()} rows</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state with query chips */
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8 px-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EBF2FD' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium mb-1">Describe the data you need</p>
              <p className="text-sm text-gray-400">or pick a sample query below to get started instantly</p>
            </div>

            {/* Sample query chips */}
            <div className="w-full max-w-2xl">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3 text-center">
                {activeSchema.icon} {activeSchema.name} — sample queries
              </p>
              <QueryChips
                queries={activeSchema.queries}
                onSelect={q => injectDemoResponse(q, q.prompt)}
              />
            </div>
          </div>
        ) : (
          <div className="px-8 py-6 space-y-8 max-w-4xl mx-auto w-full">
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed text-white" style={{ backgroundColor: '#1A73E8' }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {msg.thinking && msg.thinking.length > 0 && (
                      <AgentSteps steps={msg.thinking} />
                    )}

                    {msg.isStreaming && (!msg.thinking || msg.thinking.length === 0) && (
                      <div className="flex gap-1 px-1">
                        <span className="thinking-dot w-2 h-2 rounded-full bg-gray-300 inline-block" />
                        <span className="thinking-dot w-2 h-2 rounded-full bg-gray-300 inline-block" />
                        <span className="thinking-dot w-2 h-2 rounded-full bg-gray-300 inline-block" />
                      </div>
                    )}

                    {msg.content && !msg.sql && (
                      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                        {msg.content}
                      </div>
                    )}

                    {msg.explanation && (
                      <div className="px-4 py-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 leading-relaxed">
                        {msg.explanation}
                      </div>
                    )}

                    {msg.sql && (
                      <SQLBlock sql={msg.sql} explanation={msg.explanation} tip={msg.tip} schemaId={activeSchema.id} />
                    )}

                    {msg.sql && !msg.isStreaming && (
                      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-100" style={{ backgroundColor: '#EBF5FB' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-0.5">Performance Tip</p>
                          <p className="text-sm text-blue-700 leading-relaxed">
                            {msg.tip ?? 'Consider adding an index on the join columns and filtering early with WHERE clauses to improve query performance on large datasets.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Inline query chips after messages */}
            {!isLoading && (
              <div className="pt-2 pb-2">
                <p className="text-xs text-gray-400 mb-2.5">Try another query for {activeSchema.icon} {activeSchema.name}:</p>
                <QueryChips
                  queries={activeSchema.queries}
                  onSelect={q => injectDemoResponse(q, q.prompt)}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 px-8 py-4 bg-white">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50 transition-all bg-white">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${activeSchema.name} data...`}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
              rows={1}
              disabled={isLoading}
              style={{ minHeight: '22px', maxHeight: '120px' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1A73E8' }}
            >
              {isLoading
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            LangFetch uses AI to generate SQL. Always review queries before running.
          </p>
        </form>
      </div>
    </div>
  )
}
