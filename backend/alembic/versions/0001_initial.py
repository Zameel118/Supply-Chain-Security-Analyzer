"""Initial schema: users, scans, dependencies, findings

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Enum types used by scans / findings
    scan_status = sa.Enum("queued", "running", "complete", "failed", name="scan_status")
    finding_type = sa.Enum(
        "vulnerability",
        "typosquat",
        "dep_confusion",
        "cicd",
        "secret",
        "license",
        name="finding_type",
    )
    finding_severity = sa.Enum(
        "critical", "high", "medium", "low", "info", name="finding_severity"
    )

    scan_status.create(op.get_bind(), checkfirst=True)
    finding_type.create(op.get_bind(), checkfirst=True)
    finding_severity.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("github_id", sa.String(length=64), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_github_id", "users", ["github_id"], unique=True)

    op.create_table(
        "scans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("repo_url", sa.String(length=512), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "queued",
                "running",
                "complete",
                "failed",
                name="scan_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("private_package_prefix", sa.String(length=255), nullable=True),
        sa.Column("project_type", sa.String(length=32), nullable=False, server_default="commercial"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_scans_user_id", "scans", ["user_id"])

    op.create_table(
        "dependencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=128), nullable=True),
        sa.Column("ecosystem", sa.String(length=64), nullable=False),
        sa.Column("is_direct", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("depth", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("parent_dependency_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["parent_dependency_id"], ["dependencies.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_dependencies_scan_id", "dependencies", ["scan_id"])

    op.create_table(
        "findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("scan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "vulnerability",
                "typosquat",
                "dep_confusion",
                "cicd",
                "secret",
                "license",
                name="finding_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "severity",
            postgresql.ENUM(
                "critical",
                "high",
                "medium",
                "low",
                "info",
                name="finding_severity",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("remediation", sa.Text(), nullable=True),
        sa.Column("dependency_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("file_path", sa.String(length=1024), nullable=True),
        sa.Column("line_number", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dependency_id"], ["dependencies.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_findings_scan_id", "findings", ["scan_id"])


def downgrade() -> None:
    op.drop_index("ix_findings_scan_id", table_name="findings")
    op.drop_table("findings")
    op.drop_index("ix_dependencies_scan_id", table_name="dependencies")
    op.drop_table("dependencies")
    op.drop_index("ix_scans_user_id", table_name="scans")
    op.drop_table("scans")
    op.drop_index("ix_users_github_id", table_name="users")
    op.drop_table("users")

    sa.Enum(name="finding_severity").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="finding_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="scan_status").drop(op.get_bind(), checkfirst=True)
