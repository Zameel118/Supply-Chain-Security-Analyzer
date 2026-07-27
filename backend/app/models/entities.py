"""
ORM models for Phase 0 data model:
User → Scan → Dependency / Finding
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ScanStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"


class FindingType(str, enum.Enum):
    vulnerability = "vulnerability"
    typosquat = "typosquat"
    dep_confusion = "dep_confusion"
    cicd = "cicd"
    secret = "secret"
    license = "license"


class FindingSeverity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    github_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # Stored encrypted (Fernet). Encryption helpers land in Phase 1.
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    scans: Mapped[list["Scan"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repo_url: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[ScanStatus] = mapped_column(
        Enum(ScanStatus, name="scan_status"),
        default=ScanStatus.queued,
        nullable=False,
    )
    # Optional scan options used in later phases
    private_package_prefix: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_type: Mapped[str] = mapped_column(String(32), default="commercial", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Checkpoint belt progress: parsing | vulnerabilities | typosquats | …
    current_phase: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Nullable share token for unauthenticated public report links
    public_share_token: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="scans")
    dependencies: Mapped[list["Dependency"]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )
    findings: Mapped[list["Finding"]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )


class Dependency(Base):
    __tablename__ = "dependencies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ecosystem: Mapped[str] = mapped_column(String(64), nullable=False)  # npm, PyPI, RubyGems, Maven, …
    is_direct: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_dependency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dependencies.id", ondelete="SET NULL"),
        nullable=True,
    )

    scan: Mapped["Scan"] = relationship(back_populates="dependencies")
    parent: Mapped["Dependency | None"] = relationship(
        remote_side="Dependency.id",
        back_populates="children",
    )
    children: Mapped[list["Dependency"]] = relationship(back_populates="parent")
    findings: Mapped[list["Finding"]] = relationship(back_populates="dependency")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[FindingType] = mapped_column(Enum(FindingType, name="finding_type"), nullable=False)
    severity: Mapped[FindingSeverity] = mapped_column(
        Enum(FindingSeverity, name="finding_severity"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    remediation: Mapped[str | None] = mapped_column(Text, nullable=True)
    dependency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dependencies.id", ondelete="SET NULL"),
        nullable=True,
    )
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    line_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    scan: Mapped["Scan"] = relationship(back_populates="findings")
    dependency: Mapped["Dependency | None"] = relationship(back_populates="findings")
