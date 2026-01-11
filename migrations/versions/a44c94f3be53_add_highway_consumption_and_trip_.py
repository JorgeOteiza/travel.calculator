"""add highway consumption and trip consumption type

Revision ID: a44c94f3be53
Revises: 2083ee11f149
Create Date: 2026-01-10 23:34:15.930495
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a44c94f3be53'
down_revision = '2083ee11f149'
branch_labels = None
depends_on = None


def upgrade():
    # =========================
    # ROLE & USER_ROLE TABLES
    # =========================
    op.create_table(
        'role',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table(
        'user_role',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['role.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    # =========================
    # TRIP TABLE
    # =========================
    with op.batch_alter_table('trip', schema=None) as batch_op:
        batch_op.add_column(sa.Column('vehicle_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('consumption_type', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('base_consumption', sa.Float(), nullable=True))
        batch_op.create_foreign_key(
            'fk_trip_vehicle',
            'vehicle',
            ['vehicle_id'],
            ['id']
        )

    # =========================
    # VEHICLE TABLE
    # =========================
    with op.batch_alter_table('vehicle', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lkm_highway', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('drive_type', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('transmission', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('data_source', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))

    # =========================
    # FIX EXISTING NULL VALUES
    # =========================
    op.execute(
        "UPDATE vehicle SET fuel_type = 'unknown' WHERE fuel_type IS NULL"
    )

    op.execute(
        "UPDATE vehicle SET weight_kg = 0 WHERE weight_kg IS NULL"
    )

    # =========================
    # ENFORCE NOT NULL + UNIQUE
    # =========================
    with op.batch_alter_table('vehicle', schema=None) as batch_op:
        batch_op.alter_column(
            'fuel_type',
            existing_type=sa.VARCHAR(length=50),
            nullable=False
        )

        batch_op.alter_column(
            'weight_kg',
            existing_type=sa.INTEGER(),
            nullable=False
        )

        batch_op.create_unique_constraint(
            'uq_vehicle_make_model_year',
            ['make', 'model', 'year']
        )


def downgrade():
    # =========================
    # VEHICLE TABLE
    # =========================
    with op.batch_alter_table('vehicle', schema=None) as batch_op:
        batch_op.drop_constraint('uq_vehicle_make_model_year', type_='unique')
        batch_op.alter_column(
            'weight_kg',
            existing_type=sa.INTEGER(),
            nullable=True
        )
        batch_op.alter_column(
            'fuel_type',
            existing_type=sa.VARCHAR(length=50),
            nullable=True
        )
        batch_op.drop_column('created_at')
        batch_op.drop_column('data_source')
        batch_op.drop_column('transmission')
        batch_op.drop_column('drive_type')
        batch_op.drop_column('lkm_highway')

    # =========================
    # TRIP TABLE
    # =========================
    with op.batch_alter_table('trip', schema=None) as batch_op:
        batch_op.drop_constraint('fk_trip_vehicle', type_='foreignkey')
        batch_op.drop_column('base_consumption')
        batch_op.drop_column('consumption_type')
        batch_op.drop_column('vehicle_id')

    # =========================
    # ROLE TABLES
    # =========================
    op.drop_table('user_role')
    op.drop_table('role')
