'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'tagline' | 'fading' | 'logo' | 'cta'>('tagline')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Phase 1: Show tagline for 2.5s
    const t1 = setTimeout(() => setPhase('fading'), 2500)
    // Phase 2: Fade out for 0.8s
    const t2 = setTimeout(() => setPhase('logo'), 3300)
    // Phase 3: Show logo for 1s
    const t3 = setTimeout(() => setPhase('cta'), 4300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const handleGetStarted = () => {
    router.push('/dashboard')
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 ${darkMode ? 'dark bg-gray-950' : ''}`}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 opacity-90" />

      {/* Animated orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-google-blue rounded-full opacity-20 blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-google-green rounded-full opacity-15 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-google-yellow rounded-full opacity-10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-opacity-30 transition-all duration-200"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">

        {/* Google colors bar */}
        <div className="flex justify-center gap-2 mb-12">
          {['#EA4335', '#FBBC04', '#34A853', '#1A73E8'].map((color, i) => (
            <div
              key={i}
              className="h-1 rounded-full animate-fade-in"
              style={{
                backgroundColor: color,
                width: '48px',
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>

        {/* Phase: Tagline */}
        {(phase === 'tagline' || phase === 'fading') && (
          <div
            className="transition-all duration-800"
            style={{
              opacity: phase === 'fading' ? 0 : 1,
              transform: phase === 'fading' ? 'translateY(-20px)' : 'translateY(0)',
              transition: 'all 0.8s ease-in-out'
            }}
          >
            <h1 className="text-3xl md:text-5xl font-light text-white leading-tight mb-6 animate-fade-in">
              Experience the new era of
            </h1>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Querying your database
              <br />
              <span className="bg-gradient-to-r from-yellow-300 via-green-300 to-blue-300 bg-clip-text text-transparent">
                using natural language
              </span>
            </h2>
          </div>
        )}

        {/* Phase: Logo */}
        {(phase === 'logo' || phase === 'cta') && (
          <div
            className="transition-all duration-500"
            style={{
              opacity: phase === 'logo' || phase === 'cta' ? 1 : 0,
              transform: phase === 'logo' || phase === 'cta' ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 0.5s ease-out'
            }}
          >
            {/* Logo */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #1A73E8, #34A853)' }}
                >
                  L
                </div>
                <span className="text-6xl md:text-8xl font-bold text-white tracking-tight">
                  Lang<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-300">Fetch</span>
                </span>
              </div>
              <p className="text-xl md:text-2xl text-blue-200 font-light">
                The AI-powered SQL Copilot for your database
              </p>
            </div>

            {/* Feature pills */}
            {phase === 'cta' && (
              <div className="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in">
                {[
                  { icon: '🤖', text: 'Multi-Agent AI' },
                  { icon: '⚡', text: 'Real-time Streaming' },
                  { icon: '🔍', text: 'Schema Explorer' },
                  { icon: '📊', text: 'Analytics Dashboard' },
                ].map((pill, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 rounded-full bg-white bg-opacity-15 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-2 border border-white border-opacity-20"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <span>{pill.icon}</span>
                    <span>{pill.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA buttons */}
            {phase === 'cta' && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 rounded-full text-lg font-semibold text-blue-700 bg-white hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                >
                  Get Started Free →
                </button>
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 rounded-full text-lg font-semibold text-white border-2 border-white border-opacity-40 hover:bg-white hover:bg-opacity-10 transition-all duration-200 hover:scale-105"
                >
                  View Demo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom tagline */}
      {phase === 'cta' && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-fade-in">
          <p className="text-white text-opacity-60 text-sm">
            Powered by Claude 3.5 Sonnet · Built for Google Interview Demo
          </p>
        </div>
      )}
    </div>
  )
}
