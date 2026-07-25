"""Add scan progress, public share token for Quaywatch UI."""

from alembic import op
import sqlalchemy as sa


revision = "0002_quaywatch"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scans",
        sa.Column("current_phase", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "scans",
        sa.Column("public_share_token", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_scans_public_share_token",
        "scans",
        ["public_share_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_scans_public_share_token", table_name="scans")
    op.drop_column("scans", "public_share_token")
    op.drop_column("scans", "current_phase")
