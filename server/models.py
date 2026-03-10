from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import Integer, String, DateTime, ForeignKey
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    sub:    Mapped[int] = mapped_column(primary_key=True)
    name:   Mapped[str]
    email:  Mapped[str]

    stickers: Mapped[list["Sticker"]] = relationship(back_populates="user")
    admin:    Mapped["Admin | None"] = relationship(back_populates="user")

    def __str__(self):
        return f"{self.name} (#{self.sub})"

class Sticker(Base):
    __tablename__ = "stickers"

    id:         Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    longitude:  Mapped[float]
    latitude:   Mapped[float]
    picture:    Mapped[str]

    sub:        Mapped[int] = mapped_column(ForeignKey("users.sub"), index=True)

    user = relationship("User")

    posttime:   Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    spots:      Mapped[int] = mapped_column(default=0)
    boardyear:  Mapped[int]
    verified:   Mapped[bool] = mapped_column(default=False)
    reviewed:   Mapped[bool] = mapped_column(default=False)

    user: Mapped["User"] = relationship(back_populates="stickers")

class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sub: Mapped[int] = mapped_column(ForeignKey("users.sub"), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship(back_populates="admin")

    # run:
    #    to autogenerate a migration if this file changes:
    #        uv run alembic revision --autogenerate -m ""
    #    to run migrations (run on new clone):
    #       uv run alembic upgrade head
    #    to downgrade the database:
    #       uv run alembic downgrade base
    