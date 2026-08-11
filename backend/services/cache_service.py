import time

CACHE_TTL = 3600  # 1 hora

_cache = {}


def get_cache(key):
    """
    Obtiene valor desde cache si no ha expirado
    """

    data = _cache.get(key)

    if not data:
        return None

    if time.time() > data["expires"]:
        del _cache[key]
        return None

    return data["value"]


def set_cache(key, value, ttl=CACHE_TTL):
    """
    Guarda valor en cache
    """

    _cache[key] = {
        "value": value,
        "expires": time.time() + ttl
    }