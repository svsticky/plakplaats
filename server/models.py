from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Sticker(Base):
    __tablename__ = "stickers"
    id:         Mapped[int]      = mapped_column(primary_key=True, autoincrement=True)
    longitude:  Mapped[float]
    latitude:   Mapped[float]
    picture:    Mapped[str]
    adderemail: Mapped[str]
    posttime:   Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    spots:      Mapped[int]      = mapped_column(default=0)
    boardyear:  Mapped[int]
    verified:   Mapped[bool]     = mapped_column(default=False)
    reviewed:   Mapped[bool]     = mapped_column(default=False)

class Admin(Base):
    __tablename__ = "admins"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # OIDC subject (provided by OIDC provider)
    sub: Mapped[int] = mapped_column(unique=True, index=True)
    # Optional email field for referencing the admin by email
    email: Mapped[str | None] = mapped_column(nullable=True)

    # run:
    #    to autogenerate a migration if this file changes:
    #        uv run alembic revision --autogenerate -m ""
    #    to run migrations (run on new clone):
    #       uv run alembic upgrade head
    #    to downgrade the database:
    #       uv run alembic downgrade base
    