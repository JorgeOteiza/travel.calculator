import PropTypes from "prop-types";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useState } from "react";
import "../styles/map.css";

const libraries = ["places", "marker"];

const GoogleMapComponent = ({
  mapCenter,
  setMarkers,
  onLocationChange,
  setMapCenter,
}) => {
  const [localMarkers, setLocalMarkers] = useState([]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  if (loadError) {
    return <div>Error al cargar Google Maps. Inténtalo más tarde.</div>;
  }

  if (!isLoaded) {
    return <div>Cargando Google Maps...</div>;
  }

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(location);
          setMarkers((prev) => [...prev, location]); // Agregar al estado externo
          setLocalMarkers((prev) => [...prev, location]); // Agregar al estado local
          onLocationChange(location);
        },
        (error) => {
          console.error("🚨 Error obteniendo ubicación:", error);
          alert("No se pudo obtener tu ubicación.");
        }
      );
    } else {
      alert("La geolocalización no es compatible con tu navegador.");
    }
  };

  return (
    <div className="map-container">
      <div id="search-box-container">
        <input id="search-box" type="text" placeholder="Buscar dirección..." />
        <button className="location-btn" onClick={handleLocationClick}>
          📍
        </button>
      </div>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={mapCenter}
        zoom={12}
        options={{ disableDefaultUI: true }}
      >
        {localMarkers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}
      </GoogleMap>
    </div>
  );
};

GoogleMapComponent.propTypes = {
  mapCenter: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  setMarkers: PropTypes.func.isRequired,
  onLocationChange: PropTypes.func.isRequired,
  setMapCenter: PropTypes.func.isRequired,
};

export default GoogleMapComponent;
