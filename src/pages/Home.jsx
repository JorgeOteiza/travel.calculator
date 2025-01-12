import { useState } from "react";
import axios from "axios";
import debounce from "lodash/debounce";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import ResultsDisplay from "../components/ResultsDisplay";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

// ✅ Corrección: Variables de entorno con Vite
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const libraries = ["places", "marker"];

const Home = () => {
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    fuelType: "gasoline",
    location: "",
    destinity: "",
    passengers: 1,
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [markers, setMarkers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  // ✅ Implementación corregida de carga de Google Maps con Vite
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID], // Asegura mapId para AdvancedMarkerElement
  });

  // ✅ Solicitar ubicación solo al presionar un botón (para evitar la advertencia)
  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(userLocation);
          setMarkers([userLocation]);
        },
        (error) => console.error("Error obteniendo la ubicación:", error)
      );
    }
  };

  // ✅ Optimización con debounce y validación del input
  const fetchCarBrands = debounce(async (inputValue) => {
    try {
      if (!inputValue || inputValue.trim().length < 2) return;
      const response = await axios.get(
        `${VITE_BACKEND_URL}/api/carsxe/brands`,
        {
          params: { make: inputValue.trim() },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const brands = response.data.map((car) => ({
        label: car.make,
        value: car.make,
      }));
      setBrandOptions(brands);
    } catch (error) {
      console.error("Error fetching car brands:", error);
      alert(`Error fetching car brands: ${error.message}`);
    }
  }, 300);

  // ✅ Fetch modelos de autos
  const fetchCarModels = async (brand) => {
    try {
      const response = await axios.get(
        `${VITE_BACKEND_URL}/api/carsxe/models`,
        {
          params: { make: brand },
        }
      );
      const models = response.data.map((car) => ({
        label: car.model,
        value: car.model,
      }));
      setModelOptions(models);
    } catch (error) {
      console.error("Error fetching car models:", error);
    }
  };

  // ✅ Handlers de selección
  const handleBrandSelect = (selectedOption) => {
    setFormData({ ...formData, brand: selectedOption.value });
    fetchCarModels(selectedOption.value);
  };

  const handleModelSelect = (selectedOption) => {
    setFormData({ ...formData, model: selectedOption.value });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Cálculo del viaje con validación de campos
  const calculateTrip = async () => {
    try {
      if (
        !formData.brand ||
        !formData.model ||
        !formData.location ||
        !formData.destinity
      ) {
        alert("Please complete all fields.");
        return;
      }

      const response = await axios.post(`${VITE_BACKEND_URL}/api/calculate`, {
        ...formData,
      });

      setResults(response.data);
    } catch (error) {
      console.error("Error calculating trip:", error);
      alert("Error calculating the trip.");
    }
  };

  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div className="home-container">
      {/* ✅ Formulario con props */}
      <div className="form-container">
        <TripForm
          formData={formData}
          setFormData={setFormData}
          brandOptions={brandOptions}
          modelOptions={modelOptions}
          fetchCarBrands={fetchCarBrands}
          handleBrandSelect={handleBrandSelect}
          handleModelSelect={handleModelSelect}
          handleChange={handleChange}
          calculateTrip={calculateTrip}
        />
        {/* ✅ Botón para obtener la ubicación del usuario */}
        <button onClick={requestUserLocation}>Use My Location</button>
      </div>

      {/* ✅ Componente del mapa con marcadores */}
      <div className="mapContainer">
        <GoogleMapComponent mapCenter={mapCenter} markers={markers} />
      </div>

      {/* ✅ Mostrar resultados */}
      <ResultsDisplay results={results} />
    </div>
  );
};

export default Home;
