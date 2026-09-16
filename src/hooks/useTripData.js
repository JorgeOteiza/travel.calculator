import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const fallbackVehicles = [
  { make: "Chery", model: "Tiggo 2 GLX", year: 2021 },
  { make: "Chevrolet", model: "Groove", year: 2022 },
  { make: "Chevrolet", model: "Spark", year: 2021 },
  { make: "Hyundai", model: "Sonata", year: 2022 },
  { make: "KIA", model: "Morning", year: 2020 },
  { make: "McLaren", model: "650S", year: 2022 },
  { make: "MG", model: "ZS", year: 2022 },
  { make: "Suzuki", model: "Baleno", year: 2021 },
  { make: "Toyota", model: "Corolla", year: 2018 },
];

const uniqueOptions = (values) => [...new Set(values)]
  .sort((a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" }))
  .map((value) => ({ label: value, value }));

const useTripData = (initialFormData) => {
  const [formData, setFormData] = useState({
    ...initialFormData,
    route_polyline: initialFormData.route_polyline || null,
    climate: initialFormData.climate || "mild",
  });
  const [vehicleCatalog, setVehicleCatalog] = useState([]);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [dataWarning, setDataWarning] = useState("");
  const lastFetchRef = useRef({ brand: null, model: null, year: null });
  const ignoreRef = useRef(false);

  useEffect(() => {
    const fetchAvailableVehicles = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cars/vehicles`);
        const vehicles = Array.isArray(response.data) ? response.data : [];
        if (!vehicles.length) throw new Error("Catálogo vacío");
        setVehicleCatalog(vehicles);
      } catch {
        setVehicleCatalog(fallbackVehicles);
        setDataWarning("No pudimos actualizar el catálogo; mostramos vehículos de demostración.");
      } finally {
        setIsLoadingBrands(false);
      }
    };

    fetchAvailableVehicles();
  }, []);

  const brandOptions = useMemo(
    () => uniqueOptions(vehicleCatalog.map((vehicle) => vehicle.make)),
    [vehicleCatalog],
  );

  const modelOptions = useMemo(
    () => uniqueOptions(
      vehicleCatalog
        .filter((vehicle) => vehicle.make === formData.brand)
        .map((vehicle) => vehicle.model),
    ),
    [formData.brand, vehicleCatalog],
  );

  const availableYears = useMemo(
    () => [...new Set(
      vehicleCatalog
        .filter((vehicle) => (
          vehicle.make === formData.brand && vehicle.model === formData.model
        ))
        .map((vehicle) => Number(vehicle.year)),
    )].sort((a, b) => b - a),
    [formData.brand, formData.model, vehicleCatalog],
  );

  const fetchVehicleDetails = useCallback(async () => {
    const { brand, model, year } = formData;
    if (!brand || !model || !year) return;

    const alreadyFetched = brand === lastFetchRef.current.brand
      && model === lastFetchRef.current.model
      && year === lastFetchRef.current.year;
    if (alreadyFetched || ignoreRef.current) return;

    lastFetchRef.current = { brand, model, year };
    ignoreRef.current = true;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/cars/model_details?make=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}&year=${year}`,
      );
      if (response.status === 200 && response.data) {
        setVehicleDetails(response.data);
        if (response.data.fuel_type?.toLowerCase().includes("electric")) {
          setFormData((previous) => ({ ...previous, fuelType: "", fuelPrice: "" }));
        }
      }
    } catch (error) {
      setVehicleDetails(null);
      setDataWarning(error.response?.data?.error || "No pudimos cargar los datos del vehículo.");
    } finally {
      setTimeout(() => { ignoreRef.current = false; }, 300);
    }
  }, [formData]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  const handleBrandSelect = (option) => {
    setFormData((previous) => ({
      ...previous,
      brand: option?.value || "",
      model: "",
      year: "",
    }));
    setVehicleDetails(null);
  };

  const handleModelSelect = (option) => {
    setFormData((previous) => ({
      ...previous,
      model: option?.value || "",
      year: "",
    }));
    setVehicleDetails(null);
  };

  const handleYearSelect = (year) => {
    setFormData((previous) => ({ ...previous, year: String(year) }));
  };

  const handleChange = ({ target: { name, value } }) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
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
    isLoadingBrands,
    isLoadingModels: false,
    dataWarning,
  };
};

export default useTripData;
