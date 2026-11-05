from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Get the Supabase URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

from sqlalchemy.pool import NullPool

# Create the SQLAlchemy Engine
# Using NullPool because Supabase already uses PgBouncer (pooler).
# This prevents SQLAlchemy from holding idle connections and hitting the 15-connection limit.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
)

# Create a Session class for your API endpoints to use
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for your database models
Base = declarative_base()

# Dependency to get the database session (You will use this in your routes)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()