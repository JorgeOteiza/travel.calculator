"""add trip route labels

Revision ID: c47a12e9d630
Revises: b91f4c21d8a0
"""
from alembic import op
import sqlalchemy as sa


revision = "c47a12e9d630"
down_revision = "b91f4c21d8a0"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.add_column(sa.Column("origin_label", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("destination_label", sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.drop_column("destination_label")
        batch_op.drop_column("origin_label")
