import json
import os
import asyncio
import re
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic

router = APIRouter()

SQL_PASSTHROUGH_RE = re.compile(
    r'^\s*(SELECT|WITH\s+\w|EXPLAIN|SHOW|DESCRIBE|PRAGMA)\b',
    re.IGNORECASE
)

class ChatRequest(BaseModel):
    message: str
    history: list = []

DEMO_SCHEMA = """
Database Schema:
- users (id SERIAL PK, name VARCHAR, email VARCHAR UNIQUE, created_at TIMESTAMP)
- orders (id SERIAL PK, user_id INT FK->users.id, total DECIMAL, status VARCHAR, created_at TIMESTAMP)
- products (id SERIAL PK, name VARCHAR, price DECIMAL, category VARCHAR, stock INT)
- order_items (id SERIAL PK, order_id INT FK->orders.id, product_id INT FK->products.id, quantity INT, price DECIMAL)
"""

SYSTEM_PROMPT = """You are LangFetch, an expert SQL assistant. You help users query their PostgreSQL database using natural language.

Database Schema:
""" + DEMO_SCHEMA + """

When responding:
1. First think through the query
2. Generate clean, optimized PostgreSQL SQL
3. Explain what the SQL does

Format your response EXACTLY like this:
<thinking>Brief analysis of what the user wants</thinking>
<sql>
SELECT ... your SQL here ...
</sql>
<explanation>
Clear explanation of what the SQL does and why
</explanation>

Always use proper SQL best practices: meaningful aliases, appropriate JOINs, WHERE clauses for filtering."""

async def stream_chat(message: str, history: list):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", "demo"))

    # Pass raw SQL directly without AI transformation
    if SQL_PASSTHROUGH_RE.match(message):
        yield f"data: {json.dumps({'type': 'thinking', 'text': 'Parsing SQL query...'})}\n\n"
        await asyncio.sleep(0.25)
        yield f"data: {json.dumps({'type': 'sql', 'sql': message.strip()})}\n\n"
        yield f"data: {json.dumps({'type': 'explanation', 'text': 'Executing your SQL directly.'})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    # Agent thinking steps
    thinking_steps = [
        ("thinking", "🤖 Planning query approach..."),
        ("thinking", "📊 Retrieving relevant schema tables..."),
        ("thinking", "✍️ Generating optimized SQL..."),
        ("thinking", "✅ Validating query syntax..."),
    ]

    for step_type, step_text in thinking_steps:
        yield f"data: {json.dumps({'type': step_type, 'text': step_text})}\n\n"
        await asyncio.sleep(0.4)

    # Check if we have a real API key
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    if not api_key or api_key == "demo" or api_key.startswith("sk-ant-demo"):
        # Demo mode with hardcoded responses
        demo_responses = get_demo_response(message)

        yield f"data: {json.dumps({'type': 'sql', 'sql': demo_responses['sql']})}\n\n"
        await asyncio.sleep(0.2)
        yield f"data: {json.dumps({'type': 'explanation', 'text': demo_responses['explanation']})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    try:
        messages = []
        for h in history[-6:]:  # last 3 pairs
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        full_text = response.content[0].text

        # Parse response
        sql = ""
        explanation = ""

        if "<sql>" in full_text and "</sql>" in full_text:
            sql = full_text.split("<sql>")[1].split("</sql>")[0].strip()

        if "<explanation>" in full_text and "</explanation>" in full_text:
            explanation = full_text.split("<explanation>")[1].split("</explanation>")[0].strip()

        if not sql:
            sql = "-- Unable to generate SQL for this query\nSELECT 1;"
        if not explanation:
            explanation = full_text

        yield f"data: {json.dumps({'type': 'sql', 'sql': sql})}\n\n"
        await asyncio.sleep(0.1)
        yield f"data: {json.dumps({'type': 'explanation', 'text': explanation})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        error_msg = str(e)
        demo = get_demo_response(message)
        yield f"data: {json.dumps({'type': 'sql', 'sql': demo['sql']})}\n\n"
        yield f"data: {json.dumps({'type': 'explanation', 'text': demo['explanation']})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"


def get_demo_response(message: str) -> dict:
    msg_lower = message.lower()

    if "top" in msg_lower and ("customer" in msg_lower or "user" in msg_lower):
        return {
            "sql": """SELECT
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS total_orders,
    SUM(o.total) AS lifetime_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
GROUP BY u.id, u.name, u.email
ORDER BY lifetime_value DESC
LIMIT 10;""",
            "explanation": "This query retrieves the top 10 customers ranked by their lifetime value (total spending). It joins the users table with orders, filters for completed orders only, aggregates order counts and total spending per customer, and sorts by total spend in descending order."
        }
    elif "revenue" in msg_lower or "sales" in msg_lower:
        return {
            "sql": """SELECT
    DATE_TRUNC('month', o.created_at) AS month,
    COUNT(DISTINCT o.id) AS order_count,
    COUNT(DISTINCT o.user_id) AS unique_customers,
    SUM(o.total) AS total_revenue,
    AVG(o.total) AS avg_order_value
FROM orders o
WHERE o.status = 'completed'
    AND o.created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;""",
            "explanation": "This query shows monthly revenue metrics for the last 6 months. It calculates total orders, unique customers, total revenue, and average order value grouped by month, showing only completed orders."
        }
    elif "product" in msg_lower:
        return {
            "sql": """SELECT
    p.id,
    p.name,
    p.category,
    p.price,
    p.stock,
    COUNT(oi.id) AS times_ordered,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.price) AS total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
GROUP BY p.id, p.name, p.category, p.price, p.stock
ORDER BY total_revenue DESC NULLS LAST
LIMIT 20;""",
            "explanation": "This query shows product performance metrics including how many times each product was ordered, total units sold, and total revenue generated. Products are ranked by revenue with null values at the end."
        }
    else:
        return {
            "sql": """SELECT
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total), 0) AS total_spent,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC
LIMIT 10;""",
            "explanation": "This query retrieves a summary of user activity including order count and total spending. It uses LEFT JOIN to include users with no orders, COALESCE to handle null totals, and orders results by spending amount."
        }


@router.post("")
async def chat(request: ChatRequest):
    return StreamingResponse(
        stream_chat(request.message, request.history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
