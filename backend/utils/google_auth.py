"""Verificación de ID tokens de Google (Sign in with Google).

Usa siempre la verificación real de la librería oficial (google-auth), NO
una reimplementación propia de JWT/JWKS: firma, expiración (exp), emisor
(iss contra accounts.google.com) y audiencia (aud contra nuestro Client
ID) quedan validados por google.oauth2.id_token.verify_oauth2_token(), no
por este módulo.

Sobre la obtención de claves públicas de Google: SÍ implica una petición
de red (verify_oauth2_token -> _fetch_certs -> GET a
www.googleapis.com/oauth2/v1/certs), contra lo que se asumió en una
primera versión de este plan. Se envuelve la sesión HTTP con CacheControl
para reutilizar esas claves según el propio header Cache-Control de la
respuesta de Google (las claves rotan aproximadamente una vez al día), en
vez de ir a la red en cada login.

Nota deliberada sobre timeouts: no se fuerza aquí un timeout más corto que
el de la librería. En algunas versiones de google-auth, la obtención de
claves puede delegarse internamente a jwt.PyJWKClient, que hace su propia
petición HTTP sin pasar por el objeto Request que le entregamos -- forzar
un timeout más corto a nivel de Request no lo cubriría en ese camino, y
afirmar que sí sería impreciso. Lo que si es cierto y se aprovecha
igual en ambos caminos: CUALQUIER fallo de red o de verificación levanta
una excepción real (nunca se acepta un token cuya validación no pudo
completarse) -- el límite superior real en producción lo pone el timeout
del worker de Gunicorn (Render), no este módulo.
"""
from cachecontrol import CacheControl
import requests as python_requests
from google.auth import exceptions as google_auth_exceptions
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token


class GoogleTokenError(Exception):
    """Cualquier fallo de verificación de un ID token de Google -- firma
    inválida, expirado, issuer/audience incorrectos, credencial mal
    formada, o un fallo de red al buscar las claves públicas de Google.
    El mensaje público nunca distingue el motivo exacto (no da pistas
    útiles ante un intento de manipulación)."""


# Sesión y objeto Request reutilizados entre peticiones (a nivel de
# proceso), no recreados en cada login -- así el cacheo de CacheControl y
# la reutilización de conexión HTTP tienen efecto real.
_cached_session = CacheControl(python_requests.Session())
_google_auth_request = GoogleAuthRequest(session=_cached_session)


def verify_google_id_token(credential, audience):
    """Verifica un ID token de Google. Devuelve el diccionario de claims
    verificado (incluye al menos sub, aud, iss, exp; puede incluir email,
    email_verified, name, nonce según lo que Google haya emitido) o
    levanta GoogleTokenError -- nunca devuelve claims sin verificar."""
    if not isinstance(credential, str) or not credential:
        raise GoogleTokenError("Falta la credencial de Google.")

    try:
        claims = google_id_token.verify_oauth2_token(
            credential, _google_auth_request, audience,
        )
    except (ValueError, google_auth_exceptions.GoogleAuthError) as exc:
        raise GoogleTokenError("No se pudo verificar la cuenta de Google.") from exc

    if not claims.get("sub"):
        raise GoogleTokenError("No se pudo verificar la cuenta de Google.")

    return claims
