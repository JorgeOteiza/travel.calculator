import { useCallback, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const useWeather = (setFormData) => {
  const [weatherWarning, setWeatherWarning] = useState("");

  const fetchWeather = useCallback(async (lat, lng) => {
    setWeatherWarning("");
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/weather?lat=${lat}&lng=${lng}`,
      );
      if (response.data) {
        setFormData((previous) => ({
          ...previous,
          climate: response.data.climate,
        }));
        if (response.data.source === "fallback_due_to_exception") {
          setWeatherWarning("El clima no está disponible; usaremos condiciones moderadas.");
        }
      }
    } catch {
      setWeatherWarning("El clima no está disponible; usaremos condiciones moderadas.");
    }
  }, [setFormData]);

  return { fetchWeather, weatherWarning };
};
