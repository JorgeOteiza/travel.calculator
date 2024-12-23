import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  const [formData, setFormData] = useState({
    distance: "",
    fuelEfficiency: "",
    fuelPrice: "",
    averageSpeed: "",
    weather: "sunny", // Default condition
    slope: "flat", // Default slope
  });

  const [results, setResults] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateResults = () => {
    const {
      distance,
      fuelEfficiency,
      fuelPrice,
      averageSpeed,
      weather,
      slope,
    } = formData;

    if (!distance || !fuelEfficiency || !fuelPrice || !averageSpeed) {
      alert("Please fill all required fields");
      return;
    }

    let adjustedEfficiency = parseFloat(fuelEfficiency);
    let adjustedFuelPrice = parseFloat(fuelPrice);

    // Adjust efficiency based on weather
    switch (weather) {
      case "sunny":
        adjustedEfficiency *= 1.05;
        break;
      case "cold":
        adjustedEfficiency *= 0.85;
        break;
      case "windy":
        adjustedEfficiency *= 0.9;
        break;
      default:
        break;
    }

    // Adjust efficiency based on slope
    switch (slope) {
      case "uphill":
        adjustedEfficiency *= 0.8;
        break;
      case "downhill":
        adjustedEfficiency *= 1.1;
        break;
      default:
        break;
    }

    const fuelConsumed = parseFloat(distance) / adjustedEfficiency;
    const totalCost = fuelConsumed * adjustedFuelPrice;
    const travelTime = parseFloat(distance) / parseFloat(averageSpeed);

    setResults({
      fuelConsumed: fuelConsumed.toFixed(2),
      totalCost: totalCost.toFixed(2),
      travelTime: travelTime.toFixed(2),
    });
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Travel Calculator</h1>
      <form>
        <div className="mb-3">
          <label className="form-label">Distance (km)</label>
          <input
            type="number"
            className="form-control"
            name="distance"
            value={formData.distance}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Fuel Efficiency (km/l)</label>
          <input
            type="number"
            className="form-control"
            name="fuelEfficiency"
            value={formData.fuelEfficiency}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Fuel Price ($/l)</label>
          <input
            type="number"
            className="form-control"
            name="fuelPrice"
            value={formData.fuelPrice}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Average Speed (km/h)</label>
          <input
            type="number"
            className="form-control"
            name="averageSpeed"
            value={formData.averageSpeed}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Weather</label>
          <select
            className="form-select"
            name="weather"
            value={formData.weather}
            onChange={handleChange}
          >
            <option value="sunny">Sunny</option>
            <option value="cold">Cold</option>
            <option value="windy">Windy</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Slope</label>
          <select
            className="form-select"
            name="slope"
            value={formData.slope}
            onChange={handleChange}
          >
            <option value="flat">Flat</option>
            <option value="uphill">Uphill</option>
            <option value="downhill">Downhill</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={calculateResults}
        >
          Calculate
        </button>
      </form>

      {results && (
        <div className="mt-5">
          <h2>Results</h2>
          <p>Fuel Consumed: {results.fuelConsumed} liters</p>
          <p>Total Cost: ${results.totalCost}</p>
          <p>Travel Time: {results.travelTime} hours</p>
        </div>
      )}
    </div>
  );
};

export default Home;
