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
    vehicle: "", // Se eliminó
    extraWeight: 0, // Campo de peso extra
  });

  const [results, setResults] = useState(null);
  const [mapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [jwtToken, setJwtToken] = useState(null);

  // Configuración para cargar Google Maps
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData((prev) => ({
            ...prev,
            location: `Lat: ${latitude}, Lon: ${longitude}`,
          }));
        },
        (error) => {
          console.error("Error obteniendo la ubicación:", error);
          alert("No se pudo obtener tu ubicación.");
        }
      );
    } else {
      alert("La geolocalización no es compatible con tu navegador.");
    }
  };

  // Obtener JWT
  useEffect(() => {
    if (!jwtToken) {
      const fetchJwt = async () => {
        try {
          const response = await axios.post(
            `${VITE_BACKEND_URL}/api/auth/login`
          );
          setJwtToken(response.data.jwt); // Almacenar el JWT
        } catch (error) {
          console.error("Error al obtener el JWT", error);
        }
      };
      fetchJwt();
    }
  }, [jwtToken]);

  // Obtener marcas
  useEffect(() => {
    if (!brandOptions.length) {
      const fetchCarBrands = async () => {
        try {
          const response = await axios.get(
            `${VITE_BACKEND_URL}/api/carsxe/brands?make=all`
          );
          setBrandOptions(response.data.map((car) => car.make));
        } catch (error) {
          console.error("Error al cargar las marcas:", error);
        }
      };
      fetchCarBrands();
    }
  }, [brandOptions]);

  // Obtener vehículos
  useEffect(() => {
    if (!vehicleOptions.length) {
      const fetchVehicles = async () => {
        try {
          const response = await axios.get(
            `${VITE_BACKEND_URL}/api/carsxe/vehicles`
          );
          setVehicleOptions(response.data);
        } catch (error) {
          console.error("Error al cargar los vehículos:", error);
        }
      };
      fetchVehicles();
    }
  }, [vehicleOptions]);

  // Obtener modelos cuando se selecciona una marca
  useEffect(() => {
    if (formData.brand) {
      const fetchCarModels = async (brand) => {
        try {
          const response = await axios.get(
            `${VITE_BACKEND_URL}/api/carsxe/models`,
            {
              params: { make: brand },
            }
          );
          setModelOptions(response.data.map((car) => car.model));
        } catch (error) {
          console.error("Error al cargar los modelos:", error);
        }
      };

      fetchCarModels(formData.brand);
    }
  }, [formData.brand]);

  // Handlers de selección
  const handleBrandSelect = (selectedBrand) => {
    setFormData({ ...formData, brand: selectedBrand });
  };

  const handleModelSelect = (selectedModel) => {
    setFormData({ ...formData, model: selectedModel });
  };

  const handleVehicleSelect = (selectedVehicle) => {
    setFormData({ ...formData, vehicle: selectedVehicle });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateTrip = async () => {
    try {
      if (
        !formData.brand ||
        !formData.model ||
        !formData.location ||
        !formData.destinity
      ) {
        alert("Por favor completa todos los campos.");
        return;
      }
      const response = await axios.post(
        `${VITE_BACKEND_URL}/api/calculate`,
        formData
      );
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
          vehicleOptions={vehicleOptions}
          handleBrandSelect={handleBrandSelect}
          handleModelSelect={handleModelSelect}
          handleVehicleSelect={handleVehicleSelect}
          handleChange={handleChange}
          calculateTrip={calculateTrip}
          handleCurrentLocation={handleCurrentLocation}
        />
        <button className="mt-3 rounded-3" onClick={calculateTrip}>
          Calcular Viaje
        </button>
      </div>

      <div className="mapContainer">
        <GoogleMapComponent mapCenter={mapCenter} markers={markers} />
      </div>

      <ResultsDisplay results={results} />
    </div>
  );
};

export default Home;
