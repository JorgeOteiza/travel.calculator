import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const useWeather = (setFormData) => {
  const fetchWeather = async (lat, lng) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/weather?lat=${lat}&lng=${lng}`
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
