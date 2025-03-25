import axios from "axios";
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useWeather = (setFormData) => {
  const fetchWeather = async (lat, lng) => {
    try {
      const response = await axios.get(
        `${VITE_BACKEND_URL}/api/weather?lat=${lat}&lng=${lng}`
      );
      if (response.data) {
        setFormData((prev) => ({
          ...prev,
          climate: response.data.climate,
        }));
      }
    } catch (error) {
      console.error("🚨 Error al obtener el clima:", error);
    }
  };

  return { fetchWeather };
};
