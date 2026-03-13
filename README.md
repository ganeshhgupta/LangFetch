# LangFetch — Agentic SQL Workspace

  > Query your database in plain English. LangFetch breaks down complex questions, runs multi-step queries, and returns real answers — not just SQL.

  Powered by Claude 3.5 Sonnet · Built with Next.js + FastAPI · Runs as an MCP server inside Claude Desktop

  ---

  ## Screenshots

  | Landing Page | Query Chat | Analytics |
  |---|---|---|
  | ![Landing](https://github.com/ganeshhgupta/LangFetch/blob/main/sample/Screenshot%20(38).png?raw=true) | ![Chat](https://github.com/ganeshhgupta/LangFetch/blob/main/sample/Screenshot%20(39).png?raw=true) |
  ![Analytics](https://github.com/ganeshhgupta/LangFetch/blob/main/sample/Screenshot%20(41).png?raw=true) |

  **Claude Desktop via MCP**

  ![MCP](https://github.com/ganeshhgupta/LangFetch/blob/main/sample/Screenshot%20(45).png?raw=true)

  ---

  ## What it does

  LangFetch is an agentic data layer. You ask a complex business question — it plans, runs multiple queries in sequence, reads each result, decides what to ask next, and synthesises everything into a single
  answer.

  Ask: *"What's driving the revenue drop this month and which segments should we focus on?"*

  It doesn't generate one query and hand it back. It figures out on its own that it needs to check volume vs order value first, drill into segments, then connect the dots.

  ---

  ## Features

  - **Agentic query planning** — breaks complex questions into sequential queries, carries results forward across steps
  - **Natural language → optimised PostgreSQL** — powered by Claude 3.5 Sonnet
  - **Live query execution** — real rows from a real database, inline in the chat
  - **MCP server** — connects natively to Claude Desktop, no browser needed
  - **Schema explorer** — table/column browser with ERD diagram view and FK relationship mapping
  - **Persistent query history** — logs every query per schema, survives page refreshes
  - **5 built-in industry schemas** — E-Commerce, Healthcare, Rideshare, Streaming, Dev Platform with 170K+ rows of real data
  - **SQL passthrough** — type raw SQL directly and it executes immediately, no AI in the middle
  - **Performance tips** — surfaces index suggestions and optimisation notes alongside every query

  ---

  ## Quick Start

  ### Backend
  ```bash
  cd backend
  cp .env.example .env
  # Fill in ANTHROPIC_API_KEY and DATABASE_URL
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000

  Frontend

  cd frontend
  npm install
  npm run dev

  Open http://localhost:3000

  Seed the database

  cd backend
  python seed_db.py

  Populates all 5 schemas with realistic demo data. Takes ~60 seconds.

  ---
  MCP Server — Claude Desktop

  LangFetch exposes itself as an MCP server. Add it to Claude Desktop and your database becomes something you just talk to.

  1 — Create the config file

  - Windows: %APPDATA%\Claude\claude_desktop_config.json
  - Mac: ~/Library/Application Support/Claude/claude_desktop_config.json

  2 — Add LangFetch

  {
    "mcpServers": {
      "langfetch": {
        "command": "/path/to/python",
        "args": ["/path/to/langfetch/backend/mcp_stdio.py"]
      }
    }
  }

  Replace paths with your actual Python executable and repo location.

  3 — Restart Claude Desktop

  The hammer icon (🔨) appears in the chat input. LangFetch is now a tool Claude can call autonomously.

  Tools exposed:

  ┌────────────────┬──────────────────────────────────────────────────┐
  │      Tool      │                   What it does                   │
  ├────────────────┼──────────────────────────────────────────────────┤
  │ query_database │ Natural language → SQL → executes → returns rows │
  ├────────────────┼──────────────────────────────────────────────────┤
  │ execute_sql    │ Runs raw SQL directly                            │
  ├────────────────┼──────────────────────────────────────────────────┤
  │ list_schemas   │ Lists all available schemas                      │
  ├────────────────┼──────────────────────────────────────────────────┤
  │ get_schema     │ Returns full table/column structure for a schema │
  └────────────────┴──────────────────────────────────────────────────┘

  Try these in Claude Desktop:
  What schemas does LangFetch have access to?
  Who are the top 10 customers by revenue in the ecommerce schema?
  Which patients have the most diagnoses in the healthcare schema?
  What are the most watched titles in the streaming schema?
  Which repositories have the most merged pull requests?

  ---
  Deploy

  Frontend → Vercel

  cd frontend
  npm install -g vercel
  vercel deploy --prod
  Set NEXT_PUBLIC_API_BASE_URL to your backend URL in Vercel environment settings.

  Backend → Render

  1. Push to GitHub
  2. Create a new Web Service on Render → connect your repo
  3. Set root directory to backend
  4. Add environment variables (see below)
  5. Render auto-deploys on every push

  ---
  Environment Variables

  Backend (backend/.env)

  ┌───────────────────┬──────────┬─────────────────────────────────────────────────┐
  │     Variable      │ Required │                   Description                   │
  ├───────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ ANTHROPIC_API_KEY │ Yes      │ Claude API key from console.anthropic.com       │
  ├───────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ DATABASE_URL      │ Yes      │ PostgreSQL connection string — Neon recommended │
  ├───────────────────┼──────────┼─────────────────────────────────────────────────┤
  │ ANTHROPIC_MODEL   │ No       │ Defaults to claude-3-5-sonnet-20241022          │
  └───────────────────┴──────────┴─────────────────────────────────────────────────┘

  Frontend (frontend/.env.local)

  ┌──────────────────────────┬─────────────────────────────────────────────┐
  │         Variable         │                 Description                 │
  ├──────────────────────────┼─────────────────────────────────────────────┤
  │ NEXT_PUBLIC_API_BASE_URL │ Backend URL — http://localhost:8000 locally │
  └──────────────────────────┴─────────────────────────────────────────────┘

  ---
  Tech Stack

  ┌──────────┬──────────────────────────────────────────┐
  │  Layer   │                Technology                │
  ├──────────┼──────────────────────────────────────────┤
  │ Frontend │ Next.js 14, TypeScript, Tailwind CSS     │
  ├──────────┼──────────────────────────────────────────┤
  │ Backend  │ FastAPI, Python 3.11                     │
  ├──────────┼──────────────────────────────────────────┤
  │ AI       │ Claude 3.5 Sonnet (Anthropic)            │
  ├──────────┼──────────────────────────────────────────┤
  │ Database │ PostgreSQL (Neon)                        │
  ├──────────┼──────────────────────────────────────────┤
  │ MCP      │ Model Context Protocol — stdio transport │
  ├──────────┼──────────────────────────────────────────┤
  │ Hosting  │ Vercel (frontend) · Render (backend)     │
  └──────────┴──────────────────────────────────────────┘

  ---
  Project Structure

  langfetch/
  ├── frontend/
  │   ├── app/
  │   │   └── dashboard/
  │   │       ├── page.tsx          # Chat interface
  │   │       ├── schema/           # Schema explorer + ERD
  │   │       └── analytics/        # Metrics dashboard
  │   ├── components/
  │   │   ├── Chat.tsx              # Main chat + SQL execution
  │   │   ├── Sidebar.tsx           # Nav + live query counter
  │   │   └── TopBar.tsx
  │   └── lib/
  │       ├── schemas.ts            # Schema definitions
  │       └── queryLog.ts           # Persistent query log
  │
  └── backend/
      ├── app/
      │   ├── main.py
      │   └── routers/
      │       ├── chat.py           # LLM streaming
      │       ├── execute.py        # SQL execution
      │       ├── schema.py         # Schema API
      │       └── mcp.py            # MCP HTTP endpoint
      ├── mcp_stdio.py              # MCP stdio server for Claude Desktop
      └── seed_db.py                # Database seeder

  ---
  Live Demo

  Web app: https://frontend-one-ashen-58.vercel.app

  No signup needed. Five schemas ready to query out of the box.
  ```
