# LangFetch MVP — AI SQL Copilot

Query your database using natural language. Powered by Claude 3.5 Sonnet.

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and other values
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

### Frontend → Vercel
```bash
cd frontend
npm install -g vercel
vercel deploy --prod
# Set NEXT_PUBLIC_API_BASE_URL to your Railway backend URL
```

### Backend → Railway
1. Push to GitHub
2. Create new Railway project → Deploy from GitHub
3. Set environment variables (ANTHROPIC_API_KEY, DATABASE_URL, etc.)
4. Railway auto-deploys on push

## Environment Variables

### Backend (.env)
| Variable | Description |
|---|---|
| ANTHROPIC_API_KEY | Claude API key from console.anthropic.com |
| DATABASE_URL | PostgreSQL connection string (Neon recommended) |
| REDIS_URL | Redis connection string (Upstash recommended) |
| PINECONE_API_KEY | Pinecone API key for schema embeddings |
| PINECONE_INDEX | Pinecone index name (default: langfetch) |
| ANTHROPIC_MODEL | Claude model (default: claude-3-5-sonnet-20241022) |

### Frontend (.env.local)
| Variable | Description |
|---|---|
| NEXT_PUBLIC_API_BASE_URL | Backend API URL |

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11, LangChain
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Database**: PostgreSQL (Neon)
- **Cache**: Redis (Upstash)
- **Vector DB**: Pinecone

## Features
- Natural language → SQL generation
- Multi-agent streaming (Plan → Generate → Validate → Explain)
- Schema explorer with table/column browser
- Analytics dashboard with real metrics
- Dark mode support
- Copy/Explain/Optimize/Run SQL actions
- Demo mode (works without API key)
