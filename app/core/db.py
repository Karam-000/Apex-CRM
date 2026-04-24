from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker


# Optimized for local concurrency (SQLite-specific)
DATABASE_URL = "sqlite:///./crm.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    pool_size=20,          # Increase connection pool
    max_overflow=10,       # Allow overflow during peaks
    pool_timeout=30        # Wait for connections
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        # Enable WAL mode for high-concurrency (multi-user) support
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA synchronous=NORMAL")
        yield db
    finally:
        db.close()
