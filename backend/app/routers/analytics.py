from fastapi import APIRouter
import random
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/metrics")
async def get_metrics():
    return {
        "total_queries": 12483,
        "accuracy_rate": 94.7,
        "avg_response_time_ms": 1240,
        "time_saved_hours": 847,
        "queries_today": 143,
        "active_users": 28,
    }

@router.get("/chart")
async def get_chart():
    data = []
    base = datetime.now() - timedelta(days=29)
    for i in range(30):
        date = base + timedelta(days=i)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "queries": random.randint(80, 200),
            "accuracy": round(random.uniform(90, 98), 1),
        })
    return {"data": data}
