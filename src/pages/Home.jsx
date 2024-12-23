import React, { useState } from "react";
import axios from "axios";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateTrip = async () => {
    try {
      const { location, fuelType } = formData;

      // 1. Geocoding para obtener coordenadas del área
      const geoResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: location,
            key: "YOUR_GOOGLE_MAPS_API_KEY",
          },
        }
      );

      const { lat, lng } = geoResponse.data.results[0].geometry.location;
      setMapCenter({ lat, lng });

      // 2. Distancia entre puntos y elevación
      const distanceResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json`,
        {
          params: {
            origins: `${lat},${lng}`,
            destinations: `${lat + 0.1},${lng + 0.1}`, // Ejemplo de destinos cercanos
            key: "YOUR_GOOGLE_MAPS_API_KEY",
          },
        }
      );

      const distance = distanceResponse.data.rows[0].elements[0].distance.value;

      const elevationResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/elevation/json`,
        {
          params: {
            locations: `${lat},${lng}`,
            key: "YOUR_GOOGLE_MAPS_API_KEY",
          },
        }
      );

      const elevation = elevationResponse.data.results[0].elevation;

      // 3. Clima
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: {
            lat,
            lon: lng,
            appid: "YOUR_WEATHER_API_KEY", // Reemplázalo con tu clave
            units: "metric",
          },
        }
      );

      const weather = weatherResponse.data;

      // 4. Calcular resultados finales
      const adjustedEfficiency =
        fuelType === "gasoline" ? 15 : fuelType === "diesel" ? 18 : 6; // Simulación
      const fuelConsumed = distance / 1000 / adjustedEfficiency; // km a litros
      const totalCost = fuelConsumed * (fuelType === "electric" ? 0.12 : 1.5); // Precio estimado

      setResults({
        distance: (distance / 1000).toFixed(2),
        fuelConsumed: fuelConsumed.toFixed(2),
        totalCost: totalCost.toFixed(2),
        weather: weather.weather[0].description,
        elevation: elevation.toFixed(2),
      });
    } catch (error) {
      console.error("Error calculating trip:", error);
    }
  };

  return (
    <div className="container mt-5">
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
