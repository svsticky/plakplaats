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
    logo:       Mapped[int]
    picture:    Mapped[str]
    adderemail: Mapped[str]
    posttime:   Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    spots:      Mapped[int]      = mapped_column(default=0)
    boardyear:  Mapped[int]
    verified:   Mapped[bool]     = mapped_column(default=False)

    # run:
    #    to autogenerate a migration if this file changes:
    #        uv run alembic revision --autogenerate -m ""
    #    to run migrations (run on new clone):
    #       uv run alembic upgrade head
    #    to downgrade the database:
    #       uv run alembic downgrade base
    