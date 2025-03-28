import { useEffect, useState } from "react";
import axios from "axios";

const useTripData = (initialFormData) => {
  const [formData, setFormData] = useState(initialFormData);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [vehicleDetails, setVehicleDetails] = useState(null);

  // Obtener marcas disponibles
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get("/api/cars/brands");
        if (!Array.isArray(response.data) || response.data.length === 0) {
          console.warn("La API no devolvió marcas válidas.");
        }
        setBrandOptions(response.data);
      } catch (error) {
        console.error("Error al obtener marcas:", error);
      }
    };

    fetchBrands();
  }, []);

  // Obtener modelos cuando se seleccione una marca
  useEffect(() => {
    if (!formData.brand) {
      setModelOptions([]);
      return;
    }

    const fetchModels = async () => {
      try {
        const response = await axios.get(
          `/api/cars/models?make_id=${formData.brand}`
        );
        setModelOptions(response.data);
      } catch (error) {
        console.error("Error al obtener modelos:", error);
        setModelOptions([]);
      }
    };

    fetchModels();
  }, [formData.brand]);

  // Obtener detalles del vehículo
  useEffect(() => {
    if (!formData.brand || !formData.model || !formData.year) return;

    const fetchDetails = async () => {
      try {
        const response = await axios.get(
          `/api/cars/model_details?make=${formData.brand}&model=${formData.model}&year=${formData.year}`
        );
        setVehicleDetails(response.data);
      } catch (error) {
        console.error("Error al obtener detalles del vehículo:", error);
      }
    };

    fetchDetails();
  }, [formData.brand, formData.model, formData.year]);

  // Años disponibles si marca y modelo están seleccionados
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
