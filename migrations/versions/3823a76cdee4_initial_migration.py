"""Initial migration

Revision ID: 3823a76cdee4
Revises: 
Create Date: 2025-01-15 02:43:23.594016

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3823a76cdee4'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('trip', schema=None) as batch_op:
        batch_op.alter_column('created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
        batch_op.drop_column('vehicle')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('trip', schema=None) as batch_op:
        batch_op.add_column(sa.Column('vehicle', sa.VARCHAR(length=80), autoincrement=False, nullable=False))
        batch_op.alter_column('created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)

    # ### end Alembic commands ###
