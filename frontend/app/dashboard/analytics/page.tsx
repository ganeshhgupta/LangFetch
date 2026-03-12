'use client'

import { useEffect, useState, useMemo } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// ─── Static demo data matching mockup ────────────────────────────────────────
const LINE_DATA = (() => {
  const seed = [32,38,42,45,40,36,41,48,44,39,35,38,43,47,44,40,36,32,38,44,48,52,47,43,38,42,46,50,45,48]
  return seed.map((q, i) => {
    const d = new Date('2024-02-01'); d.setDate(d.getDate() + i)
    return { date: `Feb ${i + 1}`, queries: q }
  })
})()

const BAR_DATA = [
  { name: 'orders',      value: 480 },
  { name: 'users',       value: 310 },
  { name: 'products',    value: 260 },
  { name: 'order_items', value: 180 },
  { name: 'reviews',     value: 130 },
]

const DONUT_DATA = [
  { label: 'SELECT',    pct: 45, color: '#1A73E8' },
  { label: 'JOIN',      pct: 30, color: '#34A853' },
  { label: 'AGGREGATE', pct: 15, color: '#EA4335' },
  { label: 'SUBQUERY',  pct: 10, color: '#FBBC04' },
]

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({
  icon, value, label, trend, iconBg,
}: { icon: React.ReactNode; value: string; label: string; trend: string; iconBg: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      </div>
      <div className="flex items-center gap-1 text-xs" style={{ color: '#34A853' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
        {trend}
      </div>
    </div>
  )
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({ data }: { data: { date: string; queries: number }[] }) {
  const W = 460, H = 160, PAD = { t: 10, r: 10, b: 30, l: 30 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b
  const minV = 0, maxV = 60
  const xs = data.map((_, i) => PAD.l + (i / (data.length - 1)) * iW)
  const ys = data.map(d => PAD.t + iH - ((d.queries - minV) / (maxV - minV)) * iH)
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const areaD = pathD + ` L${xs[xs.length-1]},${PAD.t + iH} L${xs[0]},${PAD.t + iH} Z`
  const yTicks = [0, 15, 30, 45, 60]
  // Show ~8 date labels evenly
  const xLabelIdxs = [0, 2, 4, 6, 8, 11, 14, 17, 20, 23, 26, 29]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A73E8" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#1A73E8" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map(v => {
        const y = PAD.t + iH - ((v - minV) / (maxV - minV)) * iH
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3"/>
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        )
      })}
      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)"/>
      {/* Line */}
      <path d={pathD} fill="none" stroke="#1A73E8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* X-axis labels */}
      {xLabelIdxs.map(i => (
        <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{data[i]?.date}</text>
      ))}
    </svg>
  )
}

// ─── SVG Horizontal Bar Chart ─────────────────────────────────────────────────
function HBarChart({ data }: { data: { name: string; value: number }[] }) {
  const maxV = 600
  const W = 360, H = 160, PAD = { t: 8, r: 20, b: 20, l: 75 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b
  const rowH = iH / data.length
  const xTicks = [0, 150, 300, 450, 600]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Grid */}
      {xTicks.map(v => {
        const x = PAD.l + (v / maxV) * iW
        return (
          <g key={v}>
            <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + iH} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3"/>
            <text x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const y = PAD.t + i * rowH + rowH * 0.15
        const bH = rowH * 0.5
        const bW = (d.value / maxV) * iW
        return (
          <g key={d.name}>
            <text x={PAD.l - 6} y={y + bH / 2 + 4} textAnchor="end" fontSize="9" fill="#6b7280">{d.name}</text>
            <rect x={PAD.l} y={y} width={bW} height={bH} fill="#1A73E8" rx="2"/>
          </g>
        )
      })}
    </svg>
  )
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const cx = 80, cy = 85, r = 55, inner = 34
  let cumAngle = -90
  const slices = data.map(d => {
    const startAngle = cumAngle
    const sweep = (d.pct / 100) * 360
    cumAngle += sweep
    const toRad = (a: number) => (a * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(startAngle + sweep))
    const y2 = cy + r * Math.sin(toRad(startAngle + sweep))
    const xi1 = cx + inner * Math.cos(toRad(startAngle))
    const yi1 = cy + inner * Math.sin(toRad(startAngle))
    const xi2 = cx + inner * Math.cos(toRad(startAngle + sweep))
    const yi2 = cy + inner * Math.sin(toRad(startAngle + sweep))
    const large = sweep > 180 ? 1 : 0
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`
    return { ...d, path }
  })

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="170" viewBox="0 0 160 170">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color}/>)}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}/>
            <span className="text-xs text-gray-600">{d.label} {d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Latency bar ─────────────────────────────────────────────────────────────
function LatencyBar({ label, value, max }: { label: string; value: string; max: number }) {
  const numVal = parseFloat(value)
  const pct = Math.min((numVal / max) * 100, 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: '#1A73E8' }}/>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [lineData] = useState(LINE_DATA)

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <h1 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-9">Track your SQL generation metrics and performance</p>

        {/* ── 5 Metric cards ── */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <MetricCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
            iconBg="#EBF2FD" value="1.2K" label="Total Queries" trend="+12% from last month"
          />
          <MetricCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 11 12 14 22 4"/></svg>}
            iconBg="#E6F4EA" value="92.3%" label="Accuracy Rate" trend="+2.1% from last month"
          />
          <MetricCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBC04" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            iconBg="#FEF9E7" value="1.8s" label="Avg Response Time" trend="-0.3s from last month"
          />
          <MetricCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            iconBg="#F3E8FF" value="847 hrs" label="Time Saved" trend="+94 hrs from last month"
          />
          <MetricCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA4335" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
            iconBg="#FDECEA" value="67%" label="Cache Hit Rate" trend="+5% from last month"
          />
        </div>

        {/* ── Row 2: Line chart + Horizontal bar ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Queries per Day</h2>
            <LineChart data={lineData}/>
          </div>
          <div className="border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Most Queried Tables</h2>
            <HBarChart data={BAR_DATA}/>
          </div>
        </div>

        {/* ── Row 3: Donut + Performance + Cache/Token ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Query Types donut */}
          <div className="border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Query Types</h2>
            <DonutChart data={DONUT_DATA}/>
          </div>

          {/* Right column: Performance + Cache/Token */}
          <div className="flex flex-col gap-4">
            {/* Performance Overview */}
            <div className="border border-gray-200 rounded-xl p-5 flex-1">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Performance Overview</h2>
              <LatencyBar label="p50 Latency" value="0.8s" max={4}/>
              <LatencyBar label="p95 Latency" value="1.8s" max={4}/>
              <LatencyBar label="p99 Latency" value="3.2s" max={4}/>
            </div>

            {/* Cache Efficiency */}
            <div className="border border-gray-200 rounded-xl p-4" style={{ backgroundColor: '#F0FBF4' }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34A853" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">Cache Efficiency</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">67%</div>
              <div className="text-xs text-gray-500 mt-0.5">Schema embeddings cached for 24h</div>
            </div>

            {/* Token Usage */}
            <div className="border border-gray-200 rounded-xl p-4" style={{ backgroundColor: '#F8F9FA' }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1A73E8" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">Token Usage</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">~2.1K</div>
              <div className="text-xs text-gray-500 mt-0.5">Avg tokens per query</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
