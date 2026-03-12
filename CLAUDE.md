# LangFetch MVP - Production SQL Copilot

## Overview
Enterprise SQL Copilot with Google Material Design 3, multi-agent AI, streaming responses. Google colors: Red #EA4335, Yellow #FBBC04, Green #34A853, Blue #1A73E8.

## Quick Start
- Frontend: npm run dev (3000)
- Backend: uvicorn app.main:app --reload (8000)

## Architecture
- Next.js 14 App Router + TypeScript
- FastAPI + LangChain/LangGraph
- Claude 3.5 Sonnet (function calling)
- Pinecone schema embeddings
- Neon PostgreSQL + Upstash Redis
- Material Design 3 + Google Fonts

## Frontend Commands
\\\ash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build
\\\

## Backend Commands
\\\ash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
\\\

## Environment Variables
Frontend (.env.local):
- NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

Backend (.env):
- ANTHROPIC_API_KEY=sk-...
- DATABASE_URL=postgresql://...
- REDIS_URL=redis://...
- PINECONE_API_KEY=...

## Design System
- Google Blue: #1A73E8
- Google Green: #34A853
- Google Red: #EA4335
- Google Yellow: #FBBC04
- Text: #202124
- Background: #F8F9FA
- Fonts: Google Sans (Roboto fallback), Roboto Mono for code

## Key Features
1. Landing page with premium gradient, fade animations
2. Chat interface with streaming agent responses
3. Schema explorer
4. Query optimization
5. Analytics dashboard (real metrics)
6. Dark mode toggle
7. Material Design 3 UI

## MVP Scope (No tests for speed)
- Beautiful landing page
- Working chat → SQL generation
- Schema explorer
- Basic analytics
- Deploy to Vercel + Railway

## Success = 
Frontend deployed + Backend deployed + Chat works end-to-end
\\\

# Save this as CLAUDE.md
