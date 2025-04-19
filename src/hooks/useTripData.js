import { useEffect, useState } from "react";
import axios from "axios";

const useTripData = (initialFormData) => {
  const [formData, setFormData] = useState(initialFormData);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [vehicleDetails, setVehicleDetails] = useState(null);

  // Obtener marcas desde NHTSA
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get("/api/cars/brands");
        if (response.data?.length) {
          setBrandOptions(response.data);
        } else {
          console.warn("⚠️ No se recibieron marcas desde NHTSA.");
        }
      } catch (error) {
        console.error(
          "❌ Error al obtener marcas:",
          error.response?.data || error.message
        );
      }
    };

    fetchBrands();
  }, []);

  // Obtener modelos desde NHTSA
  useEffect(() => {
    if (!formData.brand) {
      setModelOptions([]);
      return;
    }

    const fetchModels = async () => {
      try {
        const response = await axios.get(
          `/api/cars/models?make_id=${encodeURIComponent(formData.brand)}`
        );
        if (response.data?.length) {
          setModelOptions(response.data);
        } else {
          console.warn(
            "⚠️ No se encontraron modelos para la marca",
            formData.brand
          );
        }
      } catch (error) {
        console.error(
          "❌ Error al obtener modelos:",
          error.response?.data || error.message
        );
        setModelOptions([]);
      }
    };

    fetchModels();
  }, [formData.brand]);

  // Obtener detalles del vehículo desde NHTSA (consulta y guarda si no existe en DB)
  useEffect(() => {
    if (!formData.brand || !formData.model || !formData.year) return;

    const fetchDetails = async () => {
      try {
        const response = await axios.get(
          `/api/cars/model_details?make=${encodeURIComponent(
            formData.brand
          )}&model=${encodeURIComponent(formData.model)}&year=${formData.year}`
        );

        if (response.status === 200 && response.data) {
          const details = response.data;
          setVehicleDetails(details);

          // Si es eléctrico, limpiamos automáticamente fuelType y fuelPrice
          if (details.fuel_type?.toLowerCase().includes("electric")) {
            setFormData((prev) => ({
              ...prev,
              fuelType: "",
              fuelPrice: "",
            }));
          }
        } else {
          console.warn("⚠️ No se recibieron detalles del vehículo.");
          setVehicleDetails(null);
        }
      } catch (error) {
        console.error(
          "❌ Error al obtener detalles del vehículo:",
          error.response?.data || error.message
        );
        setVehicleDetails(null);
      }
    };

    fetchDetails();
  }, [formData.brand, formData.model, formData.year]);

  const availableYears =
    formData.brand && formData.model
      ? Array.from({ length: 35 }, (_, i) => 2025 - i)
      : [];

  const handleBrandSelect = (brand) => {
    setFormData((prev) => ({ ...prev, brand, model: "", year: "" }));
    setModelOptions([]);
    setVehicleDetails(null);
  };

  const handleModelSelect = (model) => {
    setFormData((prev) => ({ ...prev, model, year: "" }));
    setVehicleDetails(null);
  };

  const handleYearSelect = (year) => {
    setFormData((prev) => ({ ...prev, year: String(year) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const parsedValue = [
      "fuelPrice",
      "passengers",
      "totalWeight",
      "roadGrade",
    ].includes(name)
      ? value === ""
        ? ""
        : parseFloat(value)
      : value;

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  return {
    formData,
    setFormData,
    brandOptions,
    modelOptions,
    availableYears,
    vehicleDetails,
    handleBrandSelect,
    handleModelSelect,
    handleYearSelect,
    handleChange,
  };
};

export default useTripData;
