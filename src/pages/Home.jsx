import { useState, useEffect } from "react";
import axios from "axios";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import TripResults from "../components/TripResults";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const VITE_MAP_ID = import.meta.env.VITE_MAP_ID;

const libraries = ["places"];

const Home = () => {
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    fuelType: "",
    passengers: 1,
    totalWeight: 0,
    extraWeight: 0,
    location: "",
    destinity: "",
    vehicle: "",
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers, setMarkers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [errors, setErrors] = useState({});

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [VITE_MAP_ID],
  });

  console.log("✅ Google Maps Loaded:", isLoaded, "Error:", loadError);

  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        console.log("📡 Solicitando marcas de vehículos...");
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands`
        );

        if (!response.data || response.data.length === 0) {
          throw new Error("No se recibieron datos");
        }

        console.log("✅ Marcas recibidas:", response.data);

        setBrandOptions(
          response.data.map((brand) => ({
            label: brand.label ?? "Marca desconocida",
            value: brand.value ? String(brand.value) : "",
          }))
        );
      } catch (error) {
        console.error("🚨 Error al obtener marcas:", error.message || error);
        alert("Error al obtener marcas. Verifica la conexión con el servidor.");
      }
    };

    fetchCarBrands();
  }, []);

  useEffect(() => {
    const fetchCarModels = async () => {
      if (!formData.brand) return;

      try {
        console.log("📡 Solicitando modelos para la marca:", formData.brand);
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/models?make_id=${formData.brand}`
        );

        if (!response.data || response.data.length === 0) {
          throw new Error("No se recibieron modelos");
        }

        console.log("✅ Modelos recibidos:", response.data);

        setModelOptions(
          response.data.map((model) => ({
            label: model.label ?? "Modelo Desconocido",
            value: model.value ? String(model.value) : "",
          }))
        );
      } catch (error) {
        console.error("🚨 Error al obtener modelos:", error);
        alert("Error al obtener modelos. Intenta de nuevo.");
      }
    };

    fetchCarModels();
  }, [formData.brand]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBrandSelect = (selectedBrand) => {
    if (!selectedBrand) return;
    console.log("🛠 Marca seleccionada:", selectedBrand);
    setFormData({ ...formData, brand: selectedBrand.value, model: "" });
  };

  const handleModelSelect = (selectedModel) => {
    if (!selectedModel) return;
    console.log("🛠 Modelo seleccionado:", selectedModel);
    setFormData({ ...formData, model: selectedModel.value });
  };

  const handleLocationChange = (field, newLocation) => {
    setFormData((prev) => ({
      ...prev,
      [field]: `${newLocation.lat}, ${newLocation.lng}`,
    }));
    setMapCenter(newLocation); // ✅ Ahora sí se usa correctamente
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

  const calculateTrip = async () => {
    if (!validateForm()) {
      alert("Por favor ingresa todos los datos correctamente.");
      return;
    }

    try {
      const user_id = localStorage.getItem("user_id"); // 🚀 Obtener user_id desde el almacenamiento local

      if (!user_id) {
        alert("Usuario no autenticado. Inicia sesión para continuar.");
        return;
      }

      const tripData = {
        user_id, // ✅ Ahora enviamos user_id
        brand: formData.brand,
        model: formData.model,
        fuelType: formData.fuelType,
        location: formData.location,
        destinity: formData.destinity,
      };

      console.log("📡 Enviando datos al backend:", tripData);

      const response = await axios.post(
        `${VITE_BACKEND_URL}/api/calculate`,
        tripData
      );

      console.log("✅ Resultados del viaje:", response.data);
      setResults(response.data);
    } catch (error) {
      console.error("🚨 Error al calcular el viaje:", error);
      alert("Error al calcular el viaje. Revisa la consola para más detalles.");
    }
  };

  return (
    <div className="home-container">
      <div className="form-container">
        <TripForm
          formData={formData}
          brandOptions={brandOptions}
          modelOptions={modelOptions}
          handleBrandSelect={handleBrandSelect}
          handleModelSelect={handleModelSelect}
          handleChange={handleChange}
          errors={errors}
        />
        <button className="calculate-btn" onClick={calculateTrip}>
          Calcular Viaje
        </button>
      </div>

      <div className="map-wrapper">
        {isLoaded ? (
          <GoogleMapComponent
            isLoaded={isLoaded}
            loadError={loadError}
            mapCenter={mapCenter}
            markers={markers}
            setMarkers={setMarkers}
            handleLocationChange={handleLocationChange}
          />
        ) : (
          <div className="map-loading">Cargando Google Maps...</div>
        )}
      </div>

      {results && <TripResults results={results} />}
    </div>
  );
};

export default Home;
