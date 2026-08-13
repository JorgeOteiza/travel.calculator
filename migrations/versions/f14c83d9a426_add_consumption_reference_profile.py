"""add consumption reference profile

Revision ID: f14c83d9a426
Revises: e91a72c8b315
"""
from alembic import op
import sqlalchemy as sa


revision = "f14c83d9a426"
down_revision = "e91a72c8b315"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.add_column(sa.Column("consumption_reference_profile", sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.drop_column("consumption_reference_profile")
