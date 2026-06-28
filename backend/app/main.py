from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.api import auth, projects, sessions, files, ws
from app.core.config import settings
from app.core.database import init_db
from app.services.container import container_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _idle_cleanup_loop():
    """Background loop: clean up idle containers every 60s."""
    while True:
        try:
            await container_service.cleanup_idle()
        except Exception as e:
            logger.warning(f"Idle cleanup error: {e}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Cloud Claudable backend v1.0.0")
    await init_db()
    # Launch idle container cleanup as a background task
    cleanup_task = asyncio.create_task(_idle_cleanup_loop())
    logger.info("Idle container cleanup task started (interval: 60s)")
    yield
    cleanup_task.cancel()
    logger.info("Shutting down Cloud Claudable backend...")


app = FastAPI(
    title="Cloud Claudable API",
    description="Cloud-native Claude Code execution backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",     tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(files.router,    prefix="/api/files",    tags=["files"])
app.include_router(ws.router,       prefix="/ws",           tags=["websocket"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "active_containers": container_service.get_active_count(),
    }
