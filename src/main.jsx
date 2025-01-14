import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// ✅ Validación de las variables de entorno para evitar errores
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const VITE_CAR_API_TOKEN = import.meta.env.VITE_CAR_API_TOKEN;
const VITE_MAP_ID = import.meta.env.VITE_MAP_ID;

if (!VITE_GOOGLE_MAPS_API_KEY || !VITE_BACKEND_URL || !VITE_MAP_ID) {
  console.error(
    "⚠️ Faltan variables de entorno críticas. Revisa tu archivo .env"
  );
}

// ✅ Renderizar la aplicación principal con React.StrictMode
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ Exportar las variables de entorno para su uso en otros archivos
export {
  VITE_GOOGLE_MAPS_API_KEY,
  VITE_BACKEND_URL,
  VITE_CAR_API_TOKEN,
  VITE_MAP_ID,
};
