import { useState, useEffect } from "react";
import axios from "axios";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import ResultsDisplay from "../components/ResultsDisplay";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

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
    vehicle: "",
    extraWeight: 0,
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers, setMarkers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [vehicleOptions] = useState([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  // ✅ Obtener marcas de vehículos desde el backend
  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands`
        );
        setBrandOptions(response.data);
      } catch (error) {
        console.error("🚨 Error al obtener marcas:", error);
      }
    };

    fetchCarBrands();
  }, []);

  // ✅ Obtener modelos basados en la marca seleccionada
  useEffect(() => {
    const fetchCarModels = async () => {
      if (!formData.brand) return;

      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/models?make_id=${formData.brand}`
        );
        setModelOptions(response.data);
      } catch (error) {
        console.error("🚨 Error al obtener modelos:", error);
      }
    };

    fetchCarModels();
  }, [formData.brand]);

  // ✅ Calcular el viaje
  const calculateTrip = async () => {
    try {
      const { brand, model, fuelType, location, destinity } = formData;
      if (!brand || !model || !location || !destinity) {
        alert("Por favor completa todos los campos.");
        return;
      }
      const vehicle = `${brand} ${model}`;
      const response = await axios.post(`${VITE_BACKEND_URL}/api/calculate`, {
        vehicle,
        fuelType,
        location,
        destinity,
      });
      setResults(response.data);
    } catch (error) {
      console.error("🚨 Error al calcular el viaje:", error);
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
          handleBrandSelect={(selectedBrand) =>
            setFormData({ ...formData, brand: selectedBrand.value, model: "" })
          }
          handleModelSelect={(selectedModel) =>
            setFormData({ ...formData, model: selectedModel.value })
          }
          handleChange={(e) =>
            setFormData({ ...formData, [e.target.name]: e.target.value })
          }
          calculateTrip={calculateTrip}
          handleCurrentLocation={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  setFormData((prev) => ({
                    ...prev,
                    location: `${latitude}, ${longitude}`,
                  }));
                  setMapCenter({ lat: latitude, lng: longitude });
                },
                (error) => {
                  console.error("🚨 Error obteniendo la ubicación:", error);
                  alert("No se pudo obtener tu ubicación.");
                }
              );
            } else {
              alert("La geolocalización no es compatible con tu navegador.");
            }
          }}
        />
        <button className="mt-3 rounded-3" onClick={calculateTrip}>
          Calcular Viaje
        </button>
      </div>
      <div className="mapContainer">
        <GoogleMapComponent
          mapCenter={mapCenter}
          markers={markers}
          setMarkers={setMarkers}
          onLocationChange={(newLocation) =>
            setFormData((prev) => ({
              ...prev,
              location: `${newLocation.lat}, ${newLocation.lng}`,
            }))
          }
          setMapCenter={setMapCenter}
        />
      </div>
      <ResultsDisplay results={results} />
    </div>
  );
};

export default Home;
