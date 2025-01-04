import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Renderizar la aplicación principal
ReactDOM.createRoot(document.getElementById("root")).render(<App />);

export { GOOGLE_MAPS_API_KEY, BACKEND_URL };
