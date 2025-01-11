import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const CAR_API_TOKEN = import.meta.env.VITE_CAR_API_TOKEN;
const MAP_ID = import.meta.env.VITE_MAP_ID;

// Renderizar la aplicación principal
ReactDOM.createRoot(document.getElementById("root")).render(<App />);

export { GOOGLE_MAPS_API_KEY, BACKEND_URL, CAR_API_TOKEN, MAP_ID };
