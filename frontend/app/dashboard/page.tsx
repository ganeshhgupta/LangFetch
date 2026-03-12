'use client'

import { useState } from 'react'
import Chat from '@/components/Chat'
import { SCHEMAS, type Schema } from '@/lib/schemas'

interface HistoryItem {
  query: string
  timestamp: string
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [schema, setSchema] = useState<Schema>(SCHEMAS[0])

  const handleQuerySent = (query: string) => {
    setHistory(prev => [{ query, timestamp: new Date().toISOString() }, ...prev])
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Recent Queries panel */}
      <div className="w-[195px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Queries</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3">No queries yet</p>
          ) : (
            history.map((item, i) => (
              <div key={i} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors">
                <p className="text-sm text-gray-700 truncate leading-snug">{item.query}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(new Date(item.timestamp))}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <Chat
        onQuerySent={handleQuerySent}
        selectedSchema={schema}
        onSchemaChange={setSchema}
      />
    </div>
  )
}
