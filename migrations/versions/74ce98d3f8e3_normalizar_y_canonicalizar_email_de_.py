"""normalizar y canonicalizar email de usuarios

Revision ID: 74ce98d3f8e3
Revises: 0510592fcee5
Create Date: 2026-09-28 18:01:31.265675

Checkpoint B -- deja user.email en forma canónica (recortado + minúsculas)
y agrega una garantía a nivel de base de datos para que se mantenga así.

No toca password, email_verified, AuthIdentity, VerificationToken, trips,
roles, JWT ni session_version. No crea ni elimina usuarios.

SEGURIDAD ANTE COLISIONES: antes de tocar cualquier dato, esta migración
comprueba si existen dos o más usuarios cuyo email coincide una vez
normalizado (p. ej. "Usuario@gmail.com" y "usuario@gmail.com"). Si detecta
alguna, ABORTA por completo -- no fusiona, no elige cuál conservar, no
mueve viajes, no elimina nada. Requiere resolución manual explícita antes
de poder reintentarse. El error reportado indica solo la CANTIDAD de
grupos en conflicto, nunca las direcciones de correo involucradas (el
mensaje de una excepción de migración puede terminar en logs con manejo
menos cuidadoso que una consulta administrativa directa).

SEGURIDAD ANTE EMAILS QUE QUEDARÍAN VACÍOS: el CHECK final exige además
email <> ''. Antes de crearlo, se comprueba si algún email queda vacío
tras recortar espacios (trim(email) = '') -- si existe alguno, la
migración también ABORTA antes de modificar nada, por el mismo motivo que
la comprobación de colisiones: no queremos dejar la base a medio migrar
ni decidir qué hacer con esos datos por nuestra cuenta.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '74ce98d3f8e3'
down_revision = '0510592fcee5'
branch_labels = None
depends_on = None


CHECK_CONSTRAINT_NAME = "ck_user_email_canonical"
CHECK_CONSTRAINT_EXPRESSION = "email <> '' AND email = lower(trim(email))"


def upgrade():
    conn = op.get_bind()

    # 1) Comprobar colisiones ANTES de modificar nada. lower(trim(email))
    #    es SQL estándar (no PostgreSQL-only), coherente con el
    #    CheckConstraint que se agrega más abajo y con normalize_email()
    #    en backend/utils/email_utils.py.
    collisions = conn.execute(sa.text(
        'SELECT COUNT(*) FROM ('
        '  SELECT lower(trim(email)) AS canonical_email'
        '  FROM "user"'
        '  GROUP BY lower(trim(email))'
        '  HAVING COUNT(*) > 1'
        ') AS conflictos'
    )).scalar()

    if collisions:
        raise RuntimeError(
            f"No se puede aplicar la migración '{revision}': existen "
            f"{collisions} grupo(s) de usuarios cuyo email coincide una "
            "vez normalizado (recortado + minúsculas). Esta migración NO "
            "fusiona, NO elige cuál cuenta conservar y NO modificó ningún "
            "dato -- resuelve esos casos manualmente y vuelve a intentar."
        )

    # 1b) Comprobar también, ANTES de modificar nada, que ningún email
    #     quede vacío tras recortar espacios -- el CHECK final exige
    #     email <> '', así que un dato así dejaría la migración a medio
    #     aplicar si no se detecta aquí primero.
    blank_after_trim = conn.execute(sa.text(
        'SELECT COUNT(*) FROM "user" WHERE trim(email) = \'\''
    )).scalar()

    if blank_after_trim:
        raise RuntimeError(
            f"No se puede aplicar la migración '{revision}': existen "
            f"{blank_after_trim} usuario(s) cuyo email queda vacío tras "
            "recortar espacios. Esta migración NO modificó ningún dato -- "
            "resuelve esos casos manualmente y vuelve a intentar."
        )

    # 2) Canonicalizar los emails existentes -- ya se sabe, por los pasos
    #    anteriores, que ningún UPDATE puede provocar un choque con UNIQUE
    #    ni dejar un email vacío.
    conn.execute(sa.text('UPDATE "user" SET email = lower(trim(email))'))

    # 3) Garantía a nivel de esquema: de aquí en adelante, cualquier INSERT
    #    o UPDATE que intente dejar un email no canónico o vacío falla en
    #    la base de datos, sin depender únicamente de que cada ruta/código
    #    llame a normalize_email().
    op.create_check_constraint(
        CHECK_CONSTRAINT_NAME, "user", CHECK_CONSTRAINT_EXPRESSION
    )


def downgrade():
    # Solo elimina la garantía de esquema. NO intenta reconstruir la
    # capitalización original de los emails -- esa información ya no
    # existe una vez canonicalizados en el upgrade(): es una pérdida
    # irreversible de un dato puramente estético (mayúsculas/minúsculas),
    # no de la identidad de la cuenta ni de ningún dato funcional. El
    # esquema sí puede revertir el CHECK; los valores de email NO vuelven
    # a su capitalización previa.
    op.drop_constraint(CHECK_CONSTRAINT_NAME, "user", type_="check")
