import PropTypes from "prop-types";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const libraries = ["places", "marker"]; // ✅ Declarado fuera del componente

const GoogleMapComponent = ({
  mapCenter,
  setMarkers,
  onLocationChange,
  setMapCenter,
}) => {
  const [map, setMap] = useState(null);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  useEffect(() => {
    if (loadError) {
      console.error("Error al cargar Google Maps:", loadError);
      return;
    }
    if (window.google && map) {
      const searchBox = new window.google.maps.places.SearchBox(
        document.getElementById("search-box")
      );
      map.controls[window.google.maps.ControlPosition.TOP_CENTER].push(
        document.getElementById("search-box-container")
      );

      searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (places.length === 0) return;

        const place = places[0];
        if (!place.geometry || !place.geometry.location) return;

        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        setMapCenter(location);
        setMarkers([{ lat: location.lat, lng: location.lng }]);
        onLocationChange(location);
      });
    }
  }, [map, onLocationChange, setMarkers, setMapCenter, loadError]);

  if (loadError) {
    return (
      <div>Error al cargar Google Maps. Por favor, inténtalo más tarde.</div>
    );
  }

  if (!isLoaded) {
    return <div>Cargando Google Maps...</div>;
  }

  return (
    <div>
      <div
        id="search-box-container"
        style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
        }}
      >
        <input
          id="search-box"
          type="text"
          placeholder="Buscar dirección..."
          style={{
            width: "300px",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "500px" }}
        center={mapCenter}
        zoom={12}
        onLoad={(mapInstance) => setMap(mapInstance)}
        options={{ disableDefaultUI: true }}
      />
    </div>
  );
};

GoogleMapComponent.propTypes = {
  mapCenter: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
    })
  ),
  setMarkers: PropTypes.func.isRequired,
  onLocationChange: PropTypes.func.isRequired,
  setMapCenter: PropTypes.func.isRequired,
};

export default GoogleMapComponent;
