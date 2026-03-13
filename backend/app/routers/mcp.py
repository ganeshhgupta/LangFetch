"""
LangFetch MCP Server
Implements Model Context Protocol (Streamable HTTP transport, spec 2024-11-05)
Exposes 4 tools: query_database, execute_sql, list_schemas, get_schema
"""

import json
import os
import re
import datetime
from decimal import Decimal

import anthropic
import asyncpg
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

# ─── Schema metadata ────────────────────────────────────────────────────────

SCHEMAS_INFO = {
    "ecommerce": {
        "name": "E-Commerce",
        "tables": ["customers", "orders", "order_items", "products"],
        "description": "Online retail platform — customers, orders, products, order items",
    },
    "streaming": {
        "name": "Streaming",
        "tables": ["users", "content", "watch_history", "subscriptions"],
        "description": "Video streaming platform — users, content, watch history, subscriptions",
    },
    "rideshare": {
        "name": "Rideshare",
        "tables": ["drivers", "riders", "trips", "ratings"],
        "description": "Rideshare platform — drivers, riders, trips, ratings",
    },
    "devplatform": {
        "name": "Dev Platform",
        "tables": ["users", "repositories", "commits", "pull_requests"],
        "description": "Developer platform — users, repositories, commits, pull requests",
    },
    "healthcare": {
        "name": "Healthcare",
        "tables": ["patients", "encounters", "diagnoses", "prescriptions"],
        "description": "Healthcare system — patients, encounters, diagnoses, prescriptions",
    },
}

# ─── Tool definitions (Claude reads these on startup) ───────────────────────

TOOLS = [
    {
        "name": "query_database",
        "description": (
            "Ask a natural language question about a LangFetch schema. "
            "Generates optimized PostgreSQL, executes it, and returns real results. "
            "Use this when the user wants to explore or analyse data."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "Plain English question about the data",
                },
                "schema_id": {
                    "type": "string",
                    "enum": list(SCHEMAS_INFO.keys()),
                    "description": "Which schema to query (default: ecommerce)",
                    "default": "ecommerce",
                },
            },
            "required": ["question"],
        },
    },
    {
        "name": "execute_sql",
        "description": (
            "Execute a raw SELECT query against a LangFetch schema and return rows. "
            "Use this when you already have the SQL and just want results."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "SQL SELECT statement to execute",
                },
                "schema_id": {
                    "type": "string",
                    "enum": list(SCHEMAS_INFO.keys()),
                    "description": "Which schema to run the query against",
                    "default": "ecommerce",
                },
            },
            "required": ["sql"],
        },
    },
    {
        "name": "list_schemas",
        "description": "List all available schemas in LangFetch with their tables and descriptions.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_schema",
        "description": "Get full table and column structure for a specific schema.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "schema_id": {
                    "type": "string",
                    "enum": list(SCHEMAS_INFO.keys()),
                    "description": "Which schema to inspect",
                }
            },
            "required": ["schema_id"],
        },
    },
]

# ─── Helpers ────────────────────────────────────────────────────────────────

WRITE_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|CREATE|ALTER|GRANT|REVOKE|COPY)\b",
    re.IGNORECASE,
)


def _serialize(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, datetime.datetime):
        return v.isoformat()
    if isinstance(v, datetime.date):
        return str(v)
    if isinstance(v, (int, float, bool, str)):
        return v
    return str(v)


# ─── Tool implementations ────────────────────────────────────────────────────

async def tool_query_database(question: str, schema_id: str = "ecommerce") -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not configured on the server"}

    info = SCHEMAS_INFO.get(schema_id, SCHEMAS_INFO["ecommerce"])

    client = anthropic.Anthropic(api_key=api_key)
    system = (
        f"You are a PostgreSQL expert. Generate a single optimised SELECT query "
        f"for the '{schema_id}' schema.\n"
        f"Schema: {info['description']}\n"
        f"Tables available: {', '.join(info['tables'])}\n"
        f"Rules: SELECT only. No markdown, no backticks, no explanation — just the SQL."
    )

    resp = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
        max_tokens=800,
        system=system,
        messages=[{"role": "user", "content": question}],
    )

    sql = (
        resp.content[0].text.strip()
        .replace("```sql", "")
        .replace("```", "")
        .strip()
    )

    result = await tool_execute_sql(sql, schema_id)
    result["generated_sql"] = sql
    result["question"] = question
    return result


async def tool_execute_sql(sql: str, schema_id: str = "ecommerce") -> dict:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return {"error": "DATABASE_URL not configured on the server"}

    if WRITE_PATTERN.search(sql):
        return {"error": "Only SELECT queries are permitted"}

    try:
        conn = await asyncpg.connect(database_url)
        try:
            await conn.execute(f"SET search_path TO {schema_id}, public")
            clean = sql.strip().rstrip(";")
            if not re.search(r"\bLIMIT\b", clean, re.IGNORECASE):
                clean = f"SELECT * FROM ({clean}) _q LIMIT 100"

            rows = await conn.fetch(clean)
            if not rows:
                return {"columns": [], "rows": [], "row_count": 0, "sql": sql}

            columns = list(rows[0].keys())
            data = [[_serialize(v) for v in row.values()] for row in rows]
            return {"columns": columns, "rows": data, "row_count": len(rows), "sql": sql}
        finally:
            await conn.close()
    except asyncpg.UndefinedTableError as e:
        return {"error": f"Table not found — run seed_db.py first. {e}"}
    except Exception as e:
        return {"error": str(e), "sql": sql}


def tool_list_schemas() -> dict:
    return {
        "schemas": [
            {
                "id": k,
                "name": v["name"],
                "tables": v["tables"],
                "description": v["description"],
            }
            for k, v in SCHEMAS_INFO.items()
        ]
    }


async def tool_get_schema(schema_id: str) -> dict:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # fallback to static metadata
        info = SCHEMAS_INFO.get(schema_id)
        if not info:
            return {"error": f"Unknown schema: {schema_id}"}
        return {"schema_id": schema_id, **info}

    try:
        conn = await asyncpg.connect(database_url)
        try:
            tables = await conn.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename",
                schema_id,
            )
            result = {"schema_id": schema_id, "tables": []}
            for t in tables:
                cols = await conn.fetch(
                    """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema=$1 AND table_name=$2
                    ORDER BY ordinal_position
                    """,
                    schema_id,
                    t["tablename"],
                )
                result["tables"].append(
                    {
                        "name": t["tablename"],
                        "columns": [
                            {
                                "name": c["column_name"],
                                "type": c["data_type"],
                                "nullable": c["is_nullable"] == "YES",
                            }
                            for c in cols
                        ],
                    }
                )
            return result
        finally:
            await conn.close()
    except Exception as e:
        return {"error": str(e)}


# ─── MCP JSON-RPC handler ────────────────────────────────────────────────────

@router.get("")
async def mcp_info():
    """Health check — lets Claude Desktop verify the server is reachable."""
    return {"name": "langfetch", "version": "1.0.0", "protocol": "2024-11-05"}


@router.post("")
async def mcp_handler(request: Request):
    body = await request.json()
    method = body.get("method", "")
    params = body.get("params", {})
    req_id = body.get("id")

    def ok(result):
        return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": result})

    def err(code: int, message: str):
        return JSONResponse(
            {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}
        )

    # ── Handshake ──────────────────────────────────────────────────────────
    if method == "initialize":
        return ok(
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "LangFetch", "version": "1.0.0"},
            }
        )

    if method in ("notifications/initialized", "ping"):
        return ok({})

    # ── Tool discovery ─────────────────────────────────────────────────────
    if method == "tools/list":
        return ok({"tools": TOOLS})

    # ── Tool execution ─────────────────────────────────────────────────────
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {})

        try:
            if name == "query_database":
                result = await tool_query_database(
                    question=args["question"],
                    schema_id=args.get("schema_id", "ecommerce"),
                )
            elif name == "execute_sql":
                result = await tool_execute_sql(
                    sql=args["sql"],
                    schema_id=args.get("schema_id", "ecommerce"),
                )
            elif name == "list_schemas":
                result = tool_list_schemas()
            elif name == "get_schema":
                result = await tool_get_schema(schema_id=args["schema_id"])
            else:
                return err(-32601, f"Unknown tool: {name}")

            return ok(
                {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            )

        except KeyError as e:
            return err(-32602, f"Missing required argument: {e}")
        except Exception as e:
            return err(-32603, f"Internal error: {e}")

    return err(-32601, f"Method not found: {method}")
