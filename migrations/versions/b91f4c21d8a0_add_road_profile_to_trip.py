"""add road profile to trip

Revision ID: b91f4c21d8a0
Revises: 2831dcf82e76
"""
from alembic import op
import sqlalchemy as sa


revision = "b91f4c21d8a0"
down_revision = "2831dcf82e76"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("road_profile", sa.String(length=20), nullable=False, server_default="mixed")
        )


def downgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.drop_column("road_profile")
