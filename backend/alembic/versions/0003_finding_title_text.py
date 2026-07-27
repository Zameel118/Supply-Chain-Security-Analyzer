"""0003 — finding titles can exceed 512 chars (license / OSV metadata)."""

from alembic import op
import sqlalchemy as sa


revision = "0003_finding_title_text"
down_revision = "0002_quaywatch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "findings",
        "title",
        existing_type=sa.String(length=512),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "findings",
        "title",
        existing_type=sa.Text(),
        type_=sa.String(length=512),
        existing_nullable=False,
    )
