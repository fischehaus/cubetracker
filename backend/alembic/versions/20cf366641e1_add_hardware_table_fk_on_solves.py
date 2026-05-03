"""add hardware table + fk on solves

Revision ID: 20cf366641e1
Revises: 1cbfe3113a0f
Create Date: 2026-05-03 09:46:27.046080

SQLite kann ALTER TABLE ADD CONSTRAINT nicht direkt — wir nutzen
Alembic batch_alter_table (Copy-and-Move), siehe sqlalchemy-docs.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20cf366641e1"
down_revision: Union[str, Sequence[str], None] = "1cbfe3113a0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "hardware",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("primary_cube_type", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("acquired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hardware_name"), "hardware", ["name"], unique=False)
    op.create_index(
        op.f("ix_hardware_primary_cube_type"),
        "hardware",
        ["primary_cube_type"],
        unique=False,
    )
    # SQLite-kompatibel: batch-mode fuer FK-Constraint auf existierender Tabelle
    with op.batch_alter_table("solves") as batch_op:
        batch_op.create_foreign_key(
            "fk_solves_hardware_id",
            "hardware",
            ["hardware_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("solves") as batch_op:
        batch_op.drop_constraint("fk_solves_hardware_id", type_="foreignkey")
    op.drop_index(op.f("ix_hardware_primary_cube_type"), table_name="hardware")
    op.drop_index(op.f("ix_hardware_name"), table_name="hardware")
    op.drop_table("hardware")
