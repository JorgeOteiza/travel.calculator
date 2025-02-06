import { useState, useEffect } from "react";
import axios from "axios";
import { useJsApiLoader } from "@react-google-maps/api";
import TripForm from "../components/TripForm";
import ResultsDisplay from "../components/ResultsDisplay";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const libraries = ["places", "marker"]; // ✅ Declarado fuera del componente

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
  const [jwtToken, setJwtToken] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  useEffect(() => {
    const fetchJwt = async () => {
      try {
        const response = await axios.post(`${VITE_BACKEND_URL}/api/auth/login`);
        console.log("JWT recibido:", response.data.jwt);
        setJwtToken(response.data.jwt);
      } catch (error) {
        if (error.response) {
          console.error("❌ Error del backend:", error.response.data);
        } else if (error.request) {
          console.error(
            "❌ No se recibió respuesta del backend:",
            error.request
          );
        } else {
          console.error("❌ Error desconocido:", error.message);
        }
      }
    };

    if (!jwtToken) {
      fetchJwt();
    }
  }, [jwtToken]);

  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands`
        );
        setBrandOptions(
          response.data.data.map((brand) => ({
            label: brand.name,
            value: String(brand.id),
          }))
        );
      } catch (error) {
        console.error("Error al cargar las marcas:", error);
      }
    };

    if (jwtToken && brandOptions.length === 0) {
      fetchCarBrands();
    }
  }, [jwtToken, brandOptions]);

  useEffect(() => {
    const fetchCarModels = async () => {
      try {
        if (!formData.brand) return;

        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/models`,
          {
            params: { make_id: formData.brand },
          }
        );
        setModelOptions(
          response.data.map((model) => ({
            label: model.label,
            value: String(model.value),
          }))
        );
      } catch (error) {
        console.error("Error al cargar los modelos:", error);
      }
    };

    if (formData.brand) {
      fetchCarModels();
    }
  }, [formData.brand]);

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
          handleBrandSelect={(selectedBrand) =>
            setFormData({ ...formData, brand: selectedBrand.value, model: "" })
          }
          handleModelSelect={(selectedModel) =>
            setFormData({ ...formData, model: selectedModel.value })
          }
          handleVehicleSelect={(selectedVehicle) =>
            setFormData({ ...formData, vehicle: selectedVehicle.value })
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
                  console.error("Error obteniendo la ubicación:", error);
                  alert("No se pudo obtener tu ubicación.");
                }
              );
            } else {
              alert("La geolocalización no es compatible con tu navegador.");
            }
          }}
        />
        <button className="mt-3 rounded-3" onClick={calculateTrip}>
          Calculate Trip
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
