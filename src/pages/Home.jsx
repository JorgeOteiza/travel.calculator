import { useState, useEffect } from "react";
import axios from "axios";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, BACKEND_URL } from "../main.jsx";
import TripForm from "../components/TripForm";
import ResultsDisplay from "../components/ResultsDisplay";
import GoogleMapComponent from "../components/GoogleMapComponent";
import "../styles/home.css";

const libraries = ["places"];

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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
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
  }, []);

  const fetchCarBrands = async (inputValue) => {
    try {
      if (inputValue.length < 2) return;
      const response = await axios.get(`${BACKEND_URL}/api/carsxe/brands`, {
        params: { make: inputValue },
      });
      const brands = response.data.map((car) => ({
        label: car.make,
        value: car.make,
      }));
      setBrandOptions(brands);
    } catch (error) {
      console.error("Error fetching car brands:", error);
    }
  };

  const fetchCarModels = async (brand) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/carsxe/models`, {
        params: { make: brand },
      });
      const models = response.data.map((car) => ({
        label: car.model,
        value: car.model,
      }));
      setModelOptions(models);
    } catch (error) {
      console.error("Error fetching car models:", error);
    }
  };

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

      const response = await axios.post(`${BACKEND_URL}/api/calculate`, {
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
      </div>
      <div className="mapContainer">
        <GoogleMapComponent mapCenter={mapCenter} markers={markers} />
      </div>
      <ResultsDisplay results={results} />
    </div>
  );
};

export default Home;
