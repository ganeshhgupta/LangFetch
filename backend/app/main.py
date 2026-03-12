from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, schema, analytics

app = FastAPI(title="LangFetch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(schema.router, prefix="/schema", tags=["schema"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
