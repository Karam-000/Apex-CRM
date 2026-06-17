import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import public_router, router, _create_backup_file
from app.core.db import Base, engine, SessionLocal
from app.models import entities  # noqa: F401
from seed import run_seed # Import the seed function

# Path to the built frontend (produced by `npm run build` in /frontend).
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


async def schedule_monthly_backup():
    """Background task to perform monthly backups (once on the 1st of each month)."""
    last_backup_month: str | None = None
    while True:
        now = datetime.utcnow()
        month_key = now.strftime("%Y-%m")
        # Perform backup once on the 1st of every month.
        if now.day == 1 and month_key != last_backup_month:
            with SessionLocal() as db:
                try:
                    _create_backup_file("monthly", None, db)
                    last_backup_month = month_key
                    print(f"[{now}] Automatic monthly backup completed.")
                except Exception as e:  # noqa: BLE001
                    print(f"[{now}] Automatic backup failed: {e}")
        await asyncio.sleep(24 * 3600)  # Re-check every 24 hours.


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Automatically run seed on startup to ensure default users exist.
    with SessionLocal() as db:
        run_seed(db)
    task = asyncio.create_task(schedule_monthly_backup())
    yield
    task.cancel()


app = FastAPI(title="Apex CRM", version="2.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(public_router, prefix="/api")
app.include_router(router, prefix="/api")


# --- Serve the React frontend from the same FastAPI server -------------------
# After `npm run build`, the compiled SPA lives in frontend/dist. We mount its
# static assets and fall back to index.html so client-side routes (e.g.
# /contacts, /deals) resolve when the page is refreshed or deep-linked.
if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Never let the catch-all swallow API or health routes.
        if full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404, detail="Not found")
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
