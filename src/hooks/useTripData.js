import { useEffect, useState } from "react";
import axios from "axios";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useTripData = (formData) => {
  const [user, setUser] = useState(null);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await axios.get(`${VITE_BACKEND_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        if (response.data) setUser(response.data);
      } catch (error) {
        console.error("🚨 Error al obtener usuario:", error);
        if (error.response?.status === 403) {
          alert(
            "⚠️ Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
          );
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands?year=${formData.year || 2024}`
        );

        setBrandOptions(
          response.data.map((brand) => ({
            label: brand.label ?? "Marca desconocida",
            value: brand.value ? String(brand.value) : "",
          }))
        );
      } catch (error) {
        console.error("🚨 Error al obtener marcas:", error);
        setBrandOptions([]);
      }
    };

    fetchCarBrands();
  }, [formData.year]);

  useEffect(() => {
    const fetchCarModels = async () => {
      if (!formData.brand) return;

      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/models?make_id=${
            formData.brand
          }&year=${formData.year || 2024}`
        );

        setModelOptions(
          response.data.map((model) => ({
            label: model.label ?? "Modelo Desconocido",
            value: model.value ? String(model.value) : "",
          }))
        );
      } catch (error) {
        console.error("🚨 Error al obtener modelos:", error);
        setModelOptions([]);
      }
    };

    fetchCarModels();
  }, [formData.brand, formData.year]);

  return {
    user,
    brandOptions,
    modelOptions,
  };
};
