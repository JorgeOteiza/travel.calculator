import { useState } from "react";
import axios from "axios";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import "../styles/home.css";

const Home = () => {
  const [formData, setFormData] = useState({
    vehicle: "",
    fuelType: "gasoline",
    location: "",
    destinity: "",
  });

  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    libraries: ["places"],
  });

  if (!isLoaded) return <div>Loading...</div>;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateTrip = async () => {
    try {
      const originResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: formData.location,
            key: "YOUR_GOOGLE_MAPS_API_KEY",
          },
        }
      );

      const destResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: formData.destinity,
            key: "YOUR_GOOGLE_MAPS_API_KEY",
          },
        }
      );

      const originCoords = originResponse.data.results[0].geometry.location;
      const destCoords = destResponse.data.results[0].geometry.location;

      setMapCenter(originCoords);

      const response = await axios.post("http://localhost:5000/api/calculate", {
        vehicle: formData.vehicle,
        fuelType: formData.fuelType,
        origin: formData.location,
        destinity: formData.destinity,
        coordinates: { origin: originCoords, dest: destCoords },
      });

      setResults(response.data);
    } catch (error) {
      console.error("Error calculating trip:", error);
    }
  };

  return (
    <div className="home-container">
      {/* Formulario a la izquierda */}
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
            <label className="form-label">Location</label>
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
            <label className="form-label">Destinity</label>
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
            Calculate
          </button>
        </form>

        {results && (
          <div className="results">
            <h2>Results</h2>
            <p>Distance: {results.distance} km</p>
            <p>Fuel Consumed: {results.fuelConsumed} liters</p>
            <p>Total Cost: ${results.totalCost}</p>
          </div>
        )}
      </div>

      {/* Mapa a la derecha */}
      <div className="mapContainer">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter}
          zoom={10}
        />
      </div>
    </div>
  );
};

export default Home;
