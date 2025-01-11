import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, BACKEND_URL } from "../main.jsx";
import "../styles/home.css";

const libraries = ["places"];

const Home = () => {
    const [formData, setFormData] = useState({
        brand: "",
        model: "",
        fuelType: "gasoline",
        location: "",
        destinity: "",
    });

    const [results, setResults] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
    const [markers, setMarkers] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);
    const [modelOptions, setModelOptions] = useState([]);

    // Cargar Google Maps
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries,
    });

    // Obtener ubicación del usuario al cargar la página
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

    // ✅ Obtener marcas del vehículo (Input controlado para escribir y seleccionar)
    const fetchCarBrands = async (inputValue) => {
        try {
            if (inputValue.length < 2) return;
            const response = await axios.get(
                `${BACKEND_URL}/api/carsxe/brands`,
                {
                    params: { make: inputValue },
                }
            );
            const brands = response.data.map((car) => ({
                label: car.make,
                value: car.make,
            }));
            setBrandOptions(brands);
        } catch (error) {
            console.error("Error fetching car brands:", error);
            alert("Error al obtener las marcas de vehículos.");
        }
    };

    // ✅ Obtener modelos de vehículos a través del backend Flask
const fetchCarModels = async (brand) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/carsxe/models`, {
            params: { make: brand }
        });
        const models = response.data.map((car) => ({
            label: car.model,
            value: car.model
        }));
        setModelOptions(models);
    } catch (error) {
        console.error("Error fetching car models:", error);
        alert("Error al obtener los modelos de vehículos.");
    }
};

    // ✅ Actualizar la marca y cargar modelos
    const handleBrandSelect = (selectedOption) => {
        setFormData({ ...formData, brand: selectedOption.value });
        fetchCarModels(selectedOption.value);
    };

    // ✅ Actualizar el modelo del vehículo
    const handleModelSelect = (selectedOption) => {
        setFormData({ ...formData, model: selectedOption.value });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ✅ Calcular el viaje con validaciones
    const calculateTrip = async () => {
        try {
            if (!formData.brand || !formData.model || !formData.location || !formData.destinity) {
                alert("Por favor, completa todos los campos.");
                return;
            }

            const [originResponse, destResponse] = await Promise.all([
                axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                    params: { address: formData.location, key: GOOGLE_MAPS_API_KEY },
                }),
                axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                    params: { address: formData.destinity, key: GOOGLE_MAPS_API_KEY },
                }),
            ]);

            const originCoords = originResponse.data.results[0]?.geometry?.location;
            const destCoords = destResponse.data.results[0]?.geometry?.location;

            if (!originCoords || !destCoords) {
                alert("Error al obtener coordenadas.");
                return;
            }

            setMapCenter(originCoords);
            setMarkers([originCoords, destCoords]);

            const response = await axios.post(`${BACKEND_URL}/api/calculate`, {
                vehicle: `${formData.brand} ${formData.model}`,
                fuelType: formData.fuelType,
                origin: formData.location,
                destinity: formData.destinity,
                coordinates: { origin: originCoords, dest: destCoords },
            });

            setResults(response.data);
        } catch (error) {
            console.error("Error calculating trip:", error);
            alert("Error al calcular el viaje. Verifica las claves API y los datos ingresados.");
        }
    };

    // Mostrar mensaje si Google Maps aún no está cargado
    if (!isLoaded) {
        return <div>Loading Google Maps...</div>;
    }

    // ✅ Renderizado de la Interfaz con separación de Brand y Model
    return (
        <div className="home-container">
            <div className="form-container">
                <h1>Travel Calculator</h1>
                <form>
                    {/* Autocomplete de Marca */}
                    <div className="mb-3">
                        <label className="form-label">Brand</label>
                        <Select
                            options={brandOptions}
                            onInputChange={(value) => fetchCarBrands(value)}
                            onChange={handleBrandSelect}
                            placeholder="Type a vehicle brand..."
                            noOptionsMessage={() => "Start typing to see suggestions"}
                        />
                    </div>

                    {/* Autocomplete de Modelo */}
                    <div className="mb-3">
                        <label className="form-label">Model</label>
                        <Select
                            options={modelOptions}
                            onChange={handleModelSelect}
                            placeholder="Select a vehicle model"
                            noOptionsMessage={() => "Select a brand first"}
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
            </div>

            {/* Mostrar Resultados */}
            {results && (
                <div className="results">
                    <h2>Results</h2>
                    <p>Distance: {results.distance} km</p>
                    <p>Fuel Consumed: {results.fuelConsumed} liters</p>
                    <p>Total Cost: ${results.totalCost}</p>
                    <p>Weather: {results.weather}</p>
                </div>
            )}

            {/* Google Map con marcadores */}
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
