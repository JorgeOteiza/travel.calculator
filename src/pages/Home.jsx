import React, { useState } from "react";
import axios from "axios";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import "../styles/home.css";

const Home = () => {
  const [formData, setFormData] = useState({
    vehicle: "",
    fuelType: "gasoline",
    location: "",
  });
  const [results, setResults] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Reemplázalo con tu clave
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
      // 1. Geocoding para obtener coordenadas del área
      const geoResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: formData.location,
            key: "YOUR_GOOGLE_MAPS_API_KEY",
          },
        }
      );

      const { lat, lng } = geoResponse.data.results[0].geometry.location;
      setMapCenter({ lat, lng });

      // 2. Llamada al backend para cálculos
      const response = await axios.post("http://localhost:5000/api/calculate", {
        vehicle: formData.vehicle,
        fuelType: formData.fuelType,
        location: formData.location,
        coordinates: { lat, lng },
      });

      setResults(response.data);
    } catch (error) {
      console.error("Error calculating trip:", error);
    }
  };

  return (
    <div className="container formItems">
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
          <label className="form-label .text-white-50 dropdown-toggle">
            Location
          </label>
          <input
            type="text"
            className="form-control"
            name="location"
            placeholder="select your section"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={calculateTrip}
        >
          Calculate
        </button>
      </form>

      {results && (
        <div className="mt-5">
          <h2>Results</h2>
          <p>Distance: {results.distance} km</p>
          <p>Fuel Consumed: {results.fuelConsumed} liters</p>
          <p>Total Cost: ${results.totalCost}</p>
          <p>Weather: {results.weather}</p>
          <p>Elevation: {results.elevation} meters</p>
        </div>
      )}

      {isLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "400px" }}
          center={mapCenter}
          zoom={10}
        />
      )}
    </div>
  );
};

export default Home;
