"""add vehicle calibration factor

Revision ID: 655e3e827e0d
Revises: a44c94f3be53
Create Date: 2026-01-15 02:49:20.896127

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '655e3e827e0d'
down_revision = 'a44c94f3be53'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('vehicle', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'calibration_factor',
                sa.Float(),
                nullable=False,
                server_default='1.0'
            )
        )
        batch_op.add_column(
            sa.Column(
                'calibration_samples',
                sa.Integer(),
                nullable=False,
                server_default='0'
            )
        )

    # limpiar defaults a futuro
    op.alter_column('vehicle', 'calibration_factor', server_default=None)
    op.alter_column('vehicle', 'calibration_samples', server_default=None)


    # ### end Alembic commands ###
