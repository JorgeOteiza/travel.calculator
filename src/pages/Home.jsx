import axios from "axios";
import { useState, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import TripResults from "../components/TripResults";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const Home = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  if (loadError) {
    console.error("🚨 Error cargando Google Maps API:", loadError);
  }

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "2022",
    fuelType: "",
    fuelPrice: 0,
    passengers: 1,
    totalWeight: 0,
    location: "",
    destinity: "",
    climate: "",
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers, setMarkers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [errors, setErrors] = useState({});

  // ✅ Obtener usuario autenticado al cargar la página
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
          window.location.href = "/login"; // Redirigir a login
        }
      }
    };

    fetchUser();
  }, []);

  // ✅ Obtener marcas de autos al cambiar el año
  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        console.log(
          `📡 Solicitando marcas para el año ${formData.year || 2024}...`
        );
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands?year=${formData.year || 2024}`
        );

        if (!response.data || response.data.length === 0) {
          console.warn("🚨 No se encontraron marcas.");
          setBrandOptions([]);
          return;
        }

        setBrandOptions(
          response.data.map((brand) => ({
            label: brand.label ?? "Marca desconocida",
            value: brand.value ? String(brand.value) : "",
          }))
        );
      } catch (error) {
        console.error(
          "🚨 Error al obtener marcas:",
          error.response?.status || error.message
        );
        setBrandOptions([]);
      }
    };

    fetchCarBrands();
  }, [formData.year]);

  // ✅ Obtener modelos de autos al cambiar la marca
  useEffect(() => {
    const fetchCarModels = async () => {
      if (!formData.brand) return;

      try {
        console.log(`📡 Solicitando modelos para la marca: ${formData.brand}`);
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/models?make_id=${
            formData.brand
          }&year=${formData.year || 2024}`
        );

        if (!response.data || response.data.length === 0) {
          console.warn("🚨 No se encontraron modelos.");
          setModelOptions([]);
          return;
        }

        setModelOptions(
          response.data.map((model) => ({
            label: model.label ?? "Modelo Desconocido",
            value: model.value ? String(model.value) : "",
          }))
        );
      } catch (error) {
        console.error(
          "🚨 Error al obtener modelos:",
          error.response?.status || error.message
        );
        setModelOptions([]);
      }
    };

    fetchCarModels();
  }, [formData.brand, formData.year]);

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

  const handleLocationChange = (field, newLocation) => {
    setFormData((prev) => ({
      ...prev,
      [field]: `${newLocation.lat}, ${newLocation.lng}`,
    }));
    setMapCenter(newLocation);

    if (field === "location") {
      fetchWeather(newLocation.lat, newLocation.lng);
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.brand) newErrors.brand = "Selecciona una marca.";
    if (!formData.model) newErrors.model = "Selecciona un modelo.";
    if (!formData.fuelType)
      newErrors.fuelType = "Selecciona un tipo de combustible.";
    if (!formData.location)
      newErrors.location = "Selecciona una ubicación de inicio.";
    if (!formData.destinity) newErrors.destinity = "Selecciona un destino.";
    if (isNaN(formData.totalWeight) || formData.totalWeight <= 0)
      newErrors.totalWeight = "Ingrese un peso válido.";
    if (isNaN(formData.passengers) || formData.passengers <= 0)
      newErrors.passengers = "Ingrese cantidad válida de pasajeros.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBrandSelect = (selectedBrand) => {
    setFormData((prev) => ({
      ...prev,
      brand: selectedBrand?.value || "",
      model: "",
    }));
  };

  const handleModelSelect = (selectedModel) => {
    setFormData((prev) => ({
      ...prev,
      model: selectedModel?.value || "",
    }));
  };

  const calculateTrip = async () => {
    if (!validateForm()) {
      alert("Por favor ingresa todos los datos correctamente.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Usuario no autenticado. Inicia sesión para continuar.");
        return;
      }

      const tripData = {
        ...formData,
        totalWeight: Number(formData.totalWeight),
      };

      console.log("📡 Enviando datos al backend:", tripData);

      const response = await axios.post(
        `${VITE_BACKEND_URL}/api/calculate`,
        tripData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Resultados del viaje:", response.data);
      setResults(response.data);
    } catch (error) {
      console.error(
        "🚨 Error al calcular el viaje:",
        error.response?.data || error.message
      );
      alert("Error al calcular el viaje.");
    }
  };

  return (
    <div className="home-container">
      <TripForm
        formData={formData}
        brandOptions={brandOptions || []}
        modelOptions={modelOptions || []}
        handleBrandSelect={handleBrandSelect}
        handleModelSelect={handleModelSelect}
        handleChange={(e) =>
          setFormData({ ...formData, [e.target.name]: e.target.value })
        }
        errors={errors}
      />
      <button className="calculate-btn mt-3" onClick={calculateTrip}>
        Calcular Viaje
      </button>

      {isLoaded && (
        <GoogleMapComponent
          mapCenter={mapCenter}
          markers={markers}
          setMarkers={setMarkers}
          handleLocationChange={handleLocationChange}
        />
      )}

      {!user && (
        <p className="warning-message">
          🔒 Debes iniciar sesión para guardar tu viaje.
        </p>
      )}

      {results && <TripResults results={results} />}
    </div>
  );
};

export default Home;
