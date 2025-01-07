import { useState, useEffect } from "react";
import axios from "axios";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import "../styles/home.css";

// Definir las librerías de Google Maps fuera del componente para evitar advertencias
const libraries = ["places"];

const Home = () => {
  const [formData, setFormData] = useState({
    vehicle: "",
    fuelType: "gasoline",
    location: "",
    destinity: "",
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [markers, setMarkers] = useState([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
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
        (error) => {
          console.error("Error obteniendo la ubicación:", error);
          alert("No se pudo obtener la ubicación actual.");
        }
      );
    } else {
      alert("La geolocalización no es compatible con tu navegador.");
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateTrip = async () => {
    try {
      const originResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: formData.location,
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          },
        }
      );

      const destResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: formData.destinity,
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          },
        }
      );

      const originCoords = originResponse.data.results[0].geometry.location;
      const destCoords = destResponse.data.results[0].geometry.location;

      setMapCenter(originCoords);
      setMarkers([originCoords, destCoords]);

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/calculate`,
        {
          vehicle: formData.vehicle,
          fuelType: formData.fuelType,
          origin: formData.location,
          destinity: formData.destinity,
          coordinates: { origin: originCoords, dest: destCoords },
        }
      );

      setResults(response.data);
    } catch (error) {
      console.error("Error calculating trip:", error);
      alert("Error al calcular el viaje, verifica los datos.");
    }
  };

  // ✅ Utilizar isLoaded para manejar la carga del mapa
  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div className="home-container">
      {/* Formulario */}
      <div className="form-container">
        <h1>Travel Calculator</h1>
        <form>
          <div className="mb-3">
            <label className="form-label">Vehicle</label>
            <input
              type="text"
              className="form-control"
              name="vehicle"
              value={formData.vehicle}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Fuel Type</label>
            <select
              className="form-select"
              name="fuelType"
              value={formData.fuelType}
              onChange={handleChange}
            >
              <option value="gasoline">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Location (Origin)</label>
            <input
              type="text"
              className="form-control"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Destinity (Destination)</label>
            <input
              type="text"
              className="form-control"
              name="destinity"
              value={formData.destinity}
              onChange={handleChange}
              required
            />
          </div>
          <button type="button" onClick={calculateTrip}>
            Calculate Trip
          </button>
        </form>

        {/* Resultados */}
        {results && (
          <div className="results">
            <h2>Results</h2>
            <p>Distance: {results.distance} km</p>
            <p>Fuel Consumed: {results.fuelConsumed} liters</p>
            <p>Total Cost: ${results.totalCost}</p>
            <p>Weather: {results.weather}</p>
            <p>Elevation: {results.elevation} meters</p>
          </div>
        )}
      </div>

      {/* Mapa con ubicación actual */}
      <div className="mapContainer">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter}
          zoom={12}
        >
          {markers.map((marker, index) => (
            <Marker key={index} position={marker} />
          ))}
        </GoogleMap>
      </div>
    </div>
  );
};

export default Home;
