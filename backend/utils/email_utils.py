def normalize_email(email):
    """Forma canónica de un email para autenticación: recorta espacios
    externos y pasa a minúsculas. No valida el formato (esa
    responsabilidad no existe hoy en ninguna capa del proyecto) ni toca
    caracteres internos -- deliberadamente no implementa reglas
    específicas de proveedor (puntos de Gmail, +tag, etc.).
    """
    if not isinstance(email, str):
        raise TypeError("email debe ser un string")
    return email.strip().lower()
