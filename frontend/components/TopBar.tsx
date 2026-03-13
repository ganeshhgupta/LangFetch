'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TopBar() {
  const router = useRouter()
  return (
    <header className="h-14 flex items-center px-5 border-b border-gray-200 bg-white z-50 flex-shrink-0">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 mr-auto">
        {/* Logo icon — blue square with grid */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1A73E8' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="6" rx="1" fill="white" opacity="0.9"/>
            <rect x="10" y="2" width="6" height="6" rx="1" fill="white" opacity="0.7"/>
            <rect x="2" y="10" width="6" height="6" rx="1" fill="white" opacity="0.7"/>
            <rect x="10" y="10" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-gray-900">LangFetch</span>
          <span className="text-xs text-gray-400">SQL Copilot</span>
        </div>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            try { sessionStorage.removeItem('langfetch_messages') } catch {}
            router.push('/dashboard')
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Chat
        </button>

        {/* Moon icon */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold cursor-pointer select-none"
          style={{ backgroundColor: '#34A853' }}>
          GG
        </div>
      </div>
    </header>
  )
}
