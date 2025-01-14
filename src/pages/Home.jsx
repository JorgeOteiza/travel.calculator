import { useState, useEffect } from "react";
import axios from "axios";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import ResultsDisplay from "../components/ResultsDisplay";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
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
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers, setMarkers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  // ✅ Cargar Google Maps correctamente con `libraries` como constante global
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  // ✅ Obtener la lista de marcas de autos al montar el componente
  const fetchCarBrands = async () => {
    try {
      const response = await axios.get(
        `${VITE_BACKEND_URL}/api/carsxe/brands`,
        {
          params: { make: "all" },
        }
      );
      if (response.data.error) throw new Error(response.data.error);

      const brands = response.data.map((car) => ({
        label: car.make,
        value: car.make,
      }));
      setBrandOptions(brands);
    } catch (error) {
      console.error("Error al cargar las marcas:", error);
      alert("Error al cargar las marcas: " + error.message);
    }
  };

  useEffect(() => {
    fetchCarBrands();
  }, []);

  // ✅ Obtener la ubicación del usuario
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

  // ✅ Fetch modelos al seleccionar marca
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
      console.error("Error al obtener modelos:", error);
    }
  };

  const handleBrandSelect = (selectedOption) => {
    if (!selectedOption) return;
    setFormData({ ...formData, brand: selectedOption.value });
    fetchCarModels(selectedOption.value);
  };

  const handleModelSelect = (selectedOption) => {
    setFormData({ ...formData, model: selectedOption.value });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Validación y cálculo de viaje
  const calculateTrip = async () => {
    try {
      if (
        !formData.brand ||
        !formData.model ||
        !formData.location ||
        !formData.destinity ||
        !formData.passengers
      ) {
        alert("Por favor completa todos los campos.");
        return;
      }

      const response = await axios.post(`${VITE_BACKEND_URL}/api/calculate`, {
        ...formData,
      });

      setResults(response.data);
    } catch (error) {
      console.error("Error al calcular el viaje:", error);
      alert("Error al calcular el viaje.");
    }
  };

  if (!isLoaded) {
    return <div>Cargando Google Maps...</div>;
  }

  return (
    <div className="home-container">
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
        <button className="mt-3 pt-1" onClick={requestUserLocation}>
          Usar mi ubicación
        </button>
      </div>

      {/* ✅ Componente del mapa */}
      <div className="mapContainer">
        <GoogleMapComponent mapCenter={mapCenter} markers={markers} />
      </div>

      {/* ✅ Mostrar resultados */}
      <ResultsDisplay results={results} />
    </div>
  );
};

export default Home;
