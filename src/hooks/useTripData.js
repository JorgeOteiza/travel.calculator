import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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

  const brandCache = useRef({});
  const modelCache = useRef({});

  // Marcas y modelos predeterminados
  const defaultBrands = useMemo(
    () => [
      { label: "Chery", value: "Chery" },
      { label: "Chevrolet", value: "Chevrolet" },
      { label: "Suzuki", value: "Suzuki" },
      { label: "KIA", value: "KIA" },
      { label: "MG", value: "MG" },
    ],
    []
  );

  const defaultModels = useMemo(
    () => ({
      Chery: [{ label: "Tiggo 2 GLX", value: "Tiggo 2 GLX" }],
      Chevrolet: [
        { label: "Groove", value: "Groove" },
        { label: "Spark", value: "Spark" },
      ],
      Suzuki: [{ label: "Baleno", value: "Baleno" }],
      KIA: [{ label: "Morning", value: "Morning" }],
      MG: [{ label: "ZS", value: "ZS" }],
    }),
    []
  );

  // Combinar marcas locales y de la API con caché
  useEffect(() => {
    const fetchBrands = async () => {
      if (brandCache.current.data) {
        setBrandOptions(brandCache.current.data);
        return;
      }

      try {
        const response = await axios.get("/api/cars/brands");
        if (Array.isArray(response.data) && response.data.length) {
          const combinedBrands = [...defaultBrands, ...response.data].reduce(
            (acc, brand) => {
              if (!acc.find((b) => b.value === brand.value)) {
                acc.push(brand);
              }
              return acc;
            },
            []
          );
          brandCache.current.data = combinedBrands;
          setBrandOptions(combinedBrands);
        } else {
          console.warn("⚠️ No se recibieron marcas desde NHTSA.");
          setBrandOptions(defaultBrands);
        }
      } catch (error) {
        console.error("❌ Error al obtener marcas:", error.message);
        setBrandOptions(defaultBrands);
      }
    };
    fetchBrands();
  }, [defaultBrands]);

  // Combinar modelos locales y de la API con caché
  useEffect(() => {
    if (!formData.brand) return;

    const fetchModels = async () => {
      if (modelCache.current[formData.brand]) {
        setModelOptions(modelCache.current[formData.brand]);
        return;
      }

      try {
        const res = await axios.get(
          `/api/cars/models?make_id=${encodeURIComponent(formData.brand)}`
        );
        const apiModels = res.data || [];
        const localModels = defaultModels[formData.brand] || [];
        const combinedModels = [...localModels, ...apiModels].reduce(
          (acc, model) => {
            if (!acc.find((m) => m.value === model.value)) {
              acc.push(model);
            }
            return acc;
          },
          []
        );
        modelCache.current[formData.brand] = combinedModels;
        setModelOptions(combinedModels);
      } catch (error) {
        console.error("❌ Error al obtener modelos:", error.message);
        setModelOptions(defaultModels[formData.brand] || []);
      }
    };
    fetchModels();
  }, [formData.brand, defaultModels]);

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
      ? parseFloat(value) || ""
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
