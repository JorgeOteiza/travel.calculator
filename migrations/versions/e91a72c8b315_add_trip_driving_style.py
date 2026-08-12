"""add trip driving style

Revision ID: e91a72c8b315
Revises: d82e31a9f604
"""
from alembic import op
import sqlalchemy as sa


revision = "e91a72c8b315"
down_revision = "d82e31a9f604"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.add_column(sa.Column("driving_style", sa.String(length=20), nullable=False, server_default="moderate"))


def downgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.drop_column("driving_style")
