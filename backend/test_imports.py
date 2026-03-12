"""
LangFetch Backend — Import Smoke Test
Run with: python test_imports.py
All imports should succeed and print version numbers.
"""

import sys

print(f"Python {sys.version}")
print("-" * 60)

errors = []

def check(label, fn):
    try:
        result = fn()
        print(f"  ✅  {label:<35} {result}")
    except Exception as e:
        print(f"  ❌  {label:<35} FAILED: {e}")
        errors.append(label)


# Core web framework
print("\n[Core Web Framework]")
check("fastapi", lambda: __import__("fastapi").__version__)
check("uvicorn", lambda: __import__("uvicorn").__version__)
check("starlette", lambda: __import__("starlette").__version__)
check("pydantic", lambda: __import__("pydantic").VERSION)
check("python-multipart", lambda: __import__("multipart").__version__)

# HTTP
print("\n[HTTP Client]")
check("httpx", lambda: __import__("httpx").__version__)
check("httpcore", lambda: __import__("httpcore").__version__)
check("anyio", lambda: __import__("anyio").__version__)

# Anthropic
print("\n[Anthropic SDK]")
check("anthropic", lambda: __import__("anthropic").__version__)

# FastAPI + Pydantic interop
print("\n[FastAPI Interop Test]")
def test_fastapi_pydantic():
    from fastapi import FastAPI
    from pydantic import BaseModel
    app = FastAPI()
    class M(BaseModel):
        x: str
    return "ok"
check("fastapi + pydantic BaseModel", test_fastapi_pydantic)

# LangChain ecosystem
print("\n[LangChain Ecosystem]")
check("langchain", lambda: __import__("langchain").__version__)
check("langchain-core", lambda: __import__("langchain_core").__version__)
check("langchain-community", lambda: __import__("langchain_community").__version__)
check("langchain-anthropic", lambda: __import__("langchain_anthropic").__version__)
check("langsmith", lambda: __import__("langsmith").__version__)
check("langgraph", lambda: __import__("langgraph").__version__)

# Database
print("\n[Database]")
check("sqlalchemy", lambda: __import__("sqlalchemy").__version__)
check("asyncpg", lambda: __import__("asyncpg").__version__)

# Cache
print("\n[Cache]")
check("redis", lambda: __import__("redis").__version__)

# Vector DB
print("\n[Vector DB]")
check("pinecone", lambda: __import__("pinecone").__version__)

# Utilities
print("\n[Utilities]")
check("openai", lambda: __import__("openai").__version__)
check("tiktoken", lambda: __import__("tiktoken").__version__)

# App-level imports
print("\n[App Modules]")
def test_app_main():
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from app.main import app
    return f"routes={len(app.routes)}"
check("app.main (FastAPI app)", test_app_main)

def test_chat_router():
    from app.routers.chat import router
    return f"routes={len(router.routes)}"
check("app.routers.chat", test_chat_router)

def test_schema_router():
    from app.routers.schema import router
    return f"routes={len(router.routes)}"
check("app.routers.schema", test_schema_router)

def test_analytics_router():
    from app.routers.analytics import router
    return f"routes={len(router.routes)}"
check("app.routers.analytics", test_analytics_router)

# Summary
print("\n" + "=" * 60)
if errors:
    print(f"❌  {len(errors)} import(s) FAILED: {', '.join(errors)}")
    print("    Fix the above before running the server.")
    sys.exit(1)
else:
    print("✅  All imports OK — ready to run:")
    print("    uvicorn app.main:app --reload --port 8000")
