import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.api.routes import router, _create_backup_file
from app.core.db import Base, engine, get_db, SessionLocal
from app.models import entities  # noqa: F401
from seed import run_seed # Import the seed function

app = FastAPI(title="Apex CRM", version="0.1.0")


async def schedule_monthly_backup():
    """Background task to perform monthly backups."""
    while True:
        # Check every 24 hours
        await asyncio.sleep(24 * 3600)
        now = datetime.utcnow()
        # Perform backup on the 1st of every month at midnight (approx)
        if now.day == 1:
            db_gen = get_db()
            db: Session = next(db_gen)
            try:
                _create_backup_file("monthly", None, db)
                print(f"[{now}] Automatic monthly backup completed.")
            except Exception as e:
                print(f"[{now}] Automatic backup failed: {e}")
            finally:
                db.close()


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    # Automatically run seed on startup to ensure default users exist
    with SessionLocal() as db:
        run_seed(db)
    # Start background task
    asyncio.create_task(schedule_monthly_backup())


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(router, prefix="/api")
