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

  const lastFetchRef = useRef({ brand: null, model: null, year: null });
  const ignoreRef = useRef(false);

  const brandCache = useRef({});
  const modelCache = useRef({});

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

  useEffect(() => {
    const fetchBrands = async () => {
      if (brandCache.current.data) {
        setBrandOptions(brandCache.current.data);
        return;
      }

      try {
        const response = await axios.get("/api/cars/brands");
        const apiBrands = Array.isArray(response.data) ? response.data : [];
        const combined = [...defaultBrands, ...apiBrands].reduce((acc, b) => {
          if (!acc.find((x) => x.value === b.value)) acc.push(b);
          return acc;
        }, []);
        brandCache.current.data = combined;
        setBrandOptions(combined);
      } catch {
        setBrandOptions(defaultBrands);
      }
    };

    fetchBrands();
  }, [defaultBrands]);

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
        const combined = [...localModels, ...apiModels].reduce((acc, m) => {
          if (!acc.find((x) => x.value === m.value)) acc.push(m);
          return acc;
        }, []);
        modelCache.current[formData.brand] = combined;
        setModelOptions(combined);
      } catch {
        setModelOptions(defaultModels[formData.brand] || []);
      }
    };

    fetchModels();
  }, [formData.brand, defaultModels]);

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
      }
    } finally {
      setTimeout(() => {
        ignoreRef.current = false;
      }, 800);
    }
  }, [formData]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  const availableYears =
    formData.brand && formData.model
      ? Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)
      : [];

  const handleBrandSelect = (opt) => {
    setFormData((p) => ({
      ...p,
      brand: opt?.value || "",
      model: "",
      year: "",
    }));
    setVehicleDetails(null);
    setModelOptions([]);
  };

  const handleModelSelect = (opt) => {
    setFormData((p) => ({ ...p, model: opt?.value || "", year: "" }));
    setVehicleDetails(null);
  };

  const handleYearSelect = (year) => {
    setFormData((p) => ({ ...p, year: String(year) }));
  };

  // ✅ FIX DEFINITIVO DEL "0"
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value, // ← SIEMPRE string
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
