from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncpg
import os
import re
from decimal import Decimal
import datetime

router = APIRouter()

# Only allow SELECT and WITH (CTEs that start with SELECT)
WRITE_PATTERN = re.compile(
    r'\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|CREATE|ALTER|GRANT|REVOKE|COPY|VACUUM|ANALYZE)\b',
    re.IGNORECASE
)

SCHEMA_MAP = {
    'ecommerce':   'ecommerce',
    'streaming':   'streaming',
    'rideshare':   'rideshare',
    'devplatform': 'devplatform',
    'healthcare':  'healthcare',
}


class ExecuteRequest(BaseModel):
    sql: str
    schema_id: Optional[str] = 'ecommerce'


def serialize_value(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, datetime.datetime):
        return v.isoformat()
    if isinstance(v, datetime.date):
        return str(v)
    if isinstance(v, datetime.timedelta):
        total_days = v.days
        if total_days < 0:
            return f"0 days"
        return f"{total_days} days"
    if isinstance(v, (int, float, bool, str)):
        return v
    return str(v)


@router.post("")
async def execute_query(req: ExecuteRequest):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(
            status_code=503,
            detail="DATABASE_URL not set in backend/.env — add your Neon PostgreSQL URL"
        )

    if WRITE_PATTERN.search(req.sql):
        raise HTTPException(status_code=400, detail="Only SELECT queries are permitted")

    pg_schema = SCHEMA_MAP.get(req.schema_id or 'ecommerce', 'ecommerce')

    try:
        conn = await asyncpg.connect(database_url)
        try:
            await conn.execute(f"SET search_path TO {pg_schema}, public")

            sql = req.sql.strip().rstrip(';')

            # Safety: cap rows if no LIMIT is present
            if not re.search(r'\bLIMIT\b', sql, re.IGNORECASE):
                sql = f"SELECT * FROM ({sql}) _q LIMIT 200"

            rows = await conn.fetch(sql)

            if not rows:
                return {"columns": [], "rows": [], "row_count": 0}

            columns = list(rows[0].keys())
            data = [[serialize_value(v) for v in row.values()] for row in rows]

            return {"columns": columns, "rows": data, "row_count": len(rows)}

        finally:
            await conn.close()

    except asyncpg.UndefinedTableError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Table not found — run the seed script first: python seed_db.py\n{e}"
        )
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
