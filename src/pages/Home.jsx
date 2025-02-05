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
    brand: "", // ID de la marca seleccionada
    model: "", // ID del modelo seleccionado
    fuelType: "gasoline",
    location: "",
    destinity: "",
    passengers: 1,
    vehicle: "",
    extraWeight: 0,
  });
  const [results, setResults] = useState(null);
  const [mapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]); // Opciones de marcas
  const [modelOptions, setModelOptions] = useState([]); // Opciones de modelos
  const [vehicleOptions, setVehicleOptions] = useState([]); // Opciones de vehículos
  const [jwtToken, setJwtToken] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  // ✅ Obtener ubicación actual
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData((prev) => ({
            ...prev,
            location: `${latitude}, ${longitude}`,
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

  // ✅ Obtener JWT solo una vez
  useEffect(() => {
    const fetchJwt = async () => {
      try {
        const response = await axios.post(`${VITE_BACKEND_URL}/api/auth/login`);
        setJwtToken(response.data.jwt);
      } catch (error) {
        console.error("Error al obtener el JWT", error);
      }
    };
    if (!jwtToken) {
      fetchJwt();
    }
  }, [jwtToken]);

  // ✅ Obtener marcas solo una vez
  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands`
        );
        setBrandOptions(
          response.data.data.map((brand) => ({
            label: brand.name,
            value: brand.id,
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

  // ✅ Obtener vehículos solo una vez
  useEffect(() => {
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
    if (jwtToken && vehicleOptions.length === 0) {
      fetchVehicles();
    }
  }, [jwtToken, vehicleOptions]);

  // ✅ Obtener modelos cuando se selecciona una marca
  useEffect(() => {
    const fetchCarModels = async () => {
      try {
        console.log("📡 Solicitando modelos para la marca ID:", formData.brand);
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/models`,
          {
            params: { make_id: formData.brand }, // Usar make_id aquí
          }
        );
        console.log("📥 Modelos recibidos:", response.data);
        setModelOptions(
          response.data.map((model) => ({
            label: model.label,
            value: model.value,
          }))
        );
      } catch (error) {
        console.error("❌ Error al cargar los modelos:", error);
      }
    };

    if (formData.brand) {
      fetchCarModels();
    }
  }, [formData.brand]);

  const handleBrandSelect = (selectedBrand) => {
    console.log("🚗 Marca seleccionada:", selectedBrand);
    setFormData({ ...formData, brand: selectedBrand.value, model: "" });
    setModelOptions([]); // Limpiar modelos anteriores
  };

  // ✅ Manejar la selección de modelo
  const handleModelSelect = (selectedModel) => {
    setFormData({ ...formData, model: selectedModel.value }); // Usar el ID del modelo
  };

  // ✅ Manejar la selección de vehículo
  const handleVehicleSelect = (selectedVehicle) => {
    setFormData({ ...formData, vehicle: selectedVehicle.value });
  };

  // ✅ Manejar cambios en otros campos del formulario
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
          Calculate Trip
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
