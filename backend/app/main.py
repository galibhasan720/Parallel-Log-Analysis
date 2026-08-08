"""FastAPI entrypoint (System B). HPC engine remains CLI-independent."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api import auth, benchmarks, datasets, jobs, system
from app.core.config import settings
from app.db.session import init_db
from app.jobs.runner import ensure_worker


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    init_db()
    ensure_worker()
    yield


app = FastAPI(
    title="Parallel Log Intelligence",
    version="0.1.0",
    description="System B product layer. HPC runs via LocalProcessBackend / CLI.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(benchmarks.router, prefix="/api/benchmarks", tags=["benchmarks"])
app.include_router(system.router, prefix="/api/system", tags=["system"])


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

