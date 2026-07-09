import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use DATABASE_URL from environment
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://consensus:consensus@db:5432/consensus")

# SQLAlchemy requires "postgresql://" instead of "postgres://" if the URL has the latter,
# but our .env.example uses postgresql:// so we are good.
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
