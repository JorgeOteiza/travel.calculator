import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";

const useTripData = (initialFormData) => {
  const [formData, setFormData] = useState({
    ...initialFormData,
    climate: initialFormData.climate || "mild",
  });
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [vehicleDetails, setVehicleDetails] = useState(null);

  const lastFetchRef = useRef({
    brand: null,
    model: null,
    year: null,
  });

  const ignoreRef = useRef(false);

  // 🔹 Obtener marcas permitidas desde el backend
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await axios.get("/api/cars/brands");
        if (Array.isArray(response.data) && response.data.length) {
          setBrandOptions(response.data);
        } else {
          console.warn("⚠️ No se recibieron marcas desde NHTSA.");
        }
      } catch (error) {
        console.error("❌ Error al obtener marcas:", error.message);
      }
    };
    fetchBrands();
  }, []);

  // 🔹 Obtener modelos solo si cambia la marca
  useEffect(() => {
    if (!formData.brand || formData.brand === lastFetchRef.current.brand)
      return;

    lastFetchRef.current.brand = formData.brand;
    setModelOptions([]); // Limpia modelos previos
    setVehicleDetails(null);

    const fetchModels = async () => {
      try {
        const res = await axios.get(
          `/api/cars/models?make_id=${encodeURIComponent(formData.brand)}`
        );
        setModelOptions(res.data || []);
      } catch (error) {
        console.error("❌ Error al obtener modelos:", error.message);
      }
    };

    fetchModels();
  }, [formData.brand]);

  // 🔹 Obtener detalles del vehículo solo cuando cambien marca + modelo + año
  const fetchVehicleDetails = useCallback(async () => {
    const { brand, model, year } = formData;

    if (!brand || !model || !year) return;

    const alreadyFetched =
      brand === lastFetchRef.current.brand &&
      model === lastFetchRef.current.model &&
      year === lastFetchRef.current.year;

    if (alreadyFetched || ignoreRef.current) return;

    lastFetchRef.current = { brand, model, year };
    ignoreRef.current = true;

    try {
      const res = await axios.get(
        `/api/cars/model_details?make=${encodeURIComponent(
          brand
        )}&model=${encodeURIComponent(model)}&year=${year}`
      );

      if (res.status === 200 && res.data) {
        setVehicleDetails(res.data);

        if (res.data.fuel_type?.toLowerCase().includes("electric")) {
          setFormData((prev) => ({
            ...prev,
            fuelType: "",
            fuelPrice: "",
          }));
        }
      } else {
        setVehicleDetails(null);
      }
    } catch (error) {
      console.error("❌ Error en detalles:", error.message);
      setVehicleDetails(null);
    } finally {
      setTimeout(() => {
        ignoreRef.current = false;
      }, 1000);
    }
  }, [formData]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  const availableYears =
    formData.brand && formData.model
      ? Array.from({ length: 35 }, (_, i) => 2025 - i)
      : [];

  const handleBrandSelect = (selectedOption) => {
    const brandValue = selectedOption?.value || "";
    setFormData((prev) => ({
      ...prev,
      brand: brandValue,
      model: "",
      year: "",
    }));
    setModelOptions([]);
    setVehicleDetails(null);
  };

  const handleModelSelect = (selectedOption) => {
    const modelValue = selectedOption?.value || "";
    setFormData((prev) => ({ ...prev, model: modelValue, year: "" }));
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

    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
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
