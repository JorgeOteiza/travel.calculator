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
  const [mapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [markers] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]); // ✅ Ahora guarda las marcas
  const [modelOptions, setModelOptions] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]); // ✅ Guardar los vehículos

  // ✅ Configuración para cargar Google Maps
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  // ✅ Cargar las marcas desde la API al cargar la página
  useEffect(() => {
    const fetchCarBrands = async () => {
      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/brands?make=all`
        );
        const brands = response.data.map((car) => car.make);
        setBrandOptions(brands); // ✅ Guardar las marcas en el estado
      } catch (error) {
        console.error("Error al cargar las marcas:", error);
      }
    };

    fetchCarBrands();
  }, []);

  // ✅ Cargar los vehículos desde la API al cargar la página
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await axios.get(
          `${VITE_BACKEND_URL}/api/carsxe/vehicles`
        );
        setVehicleOptions(response.data); // ✅ Guardar los vehículos en el estado
      } catch (error) {
        console.error("Error al cargar los vehículos:", error);
      }
    };

    fetchVehicles();
  }, []); // ✅ Esta useEffect se ejecuta solo una vez al cargar la página

  // ✅ Actualizar modelos al seleccionar una marca
  const fetchCarModels = async (brand) => {
    try {
      const response = await axios.get(
        `${VITE_BACKEND_URL}/api/carsxe/models`,
        {
          params: { make: brand },
        }
      );
      const models = response.data.map((car) => car.model);
      setModelOptions(models);
    } catch (error) {
      console.error("Error al cargar los modelos:", error);
    }
  };

  // ✅ Handlers de selección y validación
  const handleBrandSelect = (selectedBrand) => {
    setFormData({ ...formData, brand: selectedBrand });
    fetchCarModels(selectedBrand);
  };

  const handleModelSelect = (selectedModel) => {
    setFormData({ ...formData, model: selectedModel });
  };

  const handleVehicleSelect = (selectedVehicle) => {
    setFormData({ ...formData, vehicle: selectedVehicle }); // ✅ Actualizar vehículo
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
          brandOptions={brandOptions} // ✅ Pasando las marcas al formulario
          modelOptions={modelOptions}
          vehicleOptions={vehicleOptions} // ✅ Pasando los vehículos al formulario
          handleBrandSelect={handleBrandSelect}
          handleModelSelect={handleModelSelect}
          handleVehicleSelect={handleVehicleSelect} // ✅ Handler para seleccionar vehículo
          handleChange={handleChange}
          calculateTrip={calculateTrip}
        />
        <button className="mt-3 pt-1" onClick={calculateTrip}>
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
