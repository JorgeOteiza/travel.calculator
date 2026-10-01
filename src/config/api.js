export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
export const MAP_ID = import.meta.env.VITE_MAP_ID;
// Identificador público del cliente OAuth de "Sign in with Google" -- no
// es un secreto (viaja incluso dentro del propio ID token). Si no está
// configurada, el botón de Google simplemente no se renderiza (ver
// GoogleSignInButton.jsx) y el acceso por contraseña sigue funcionando
// igual.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
