"""add trip calculation context

Revision ID: d82e31a9f604
Revises: c47a12e9d630
"""
from alembic import op
import sqlalchemy as sa


revision = "d82e31a9f604"
down_revision = "c47a12e9d630"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.add_column(sa.Column("fuel_octane", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("user_consumption_kml", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("consumption_source", sa.String(length=20), nullable=False, server_default="standard"))
        batch_op.add_column(sa.Column("elevation_profile", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("consumption_profile", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("elevation_source", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("segments_analyzed", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("operating_conditions", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("trip", schema=None) as batch_op:
        batch_op.drop_column("operating_conditions")
        batch_op.drop_column("segments_analyzed")
        batch_op.drop_column("elevation_source")
        batch_op.drop_column("consumption_profile")
        batch_op.drop_column("elevation_profile")
        batch_op.drop_column("consumption_source")
        batch_op.drop_column("user_consumption_kml")
        batch_op.drop_column("fuel_octane")
