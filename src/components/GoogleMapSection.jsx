import PropTypes from "prop-types";
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useLoadScript,
} from "@react-google-maps/api";
import { useState, useRef, useEffect } from "react";
import "../styles/map.css";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const GoogleMapSection = ({
  mapCenter,
  markers,
  setMarkers,
  handleLocationChange,
}) => {
  const searchBoxRefOrigin = useRef(null);
  const searchBoxRefDestiny = useRef(null);
  const setMap = useState(null)[1];

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: ["places"],
  });

  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error("🚨 No se encontró VITE_GOOGLE_MAPS_API_KEY en .env");
    }
  }, []);

  if (loadError) {
    console.error("🚨 Error cargando Google Maps:", loadError);
    return <div>Error cargando Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="loading-maps">Cargando Google Maps...</div>;
  }

  const onPlacesChanged = (searchBox, type) => {
    if (!searchBox?.getPlaces) return;
    const places = searchBox.getPlaces();

    if (!places || places.length === 0) {
      console.warn("⚠️ No se encontró ninguna ubicación.");
      return;
    }

    const place = places[0];
    if (!place.geometry?.location) {
      console.error("🚨 La ubicación seleccionada no tiene coordenadas.");
      return;
    }

    const newLocation = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    handleLocationChange(
      type === "origin" ? "location" : "destinity",
      newLocation
    );
    setMarkers([newLocation]);
  };

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <StandaloneSearchBox
          onLoad={(ref) => (searchBoxRefOrigin.current = ref)}
          onPlacesChanged={() =>
            onPlacesChanged(searchBoxRefOrigin.current, "origin")
          }
        >
          <input
            type="text"
            className="search-box"
            placeholder="Ubicación de inicio"
          />
        </StandaloneSearchBox>

        <StandaloneSearchBox
          onLoad={(ref) => (searchBoxRefDestiny.current = ref)}
          onPlacesChanged={() =>
            onPlacesChanged(searchBoxRefDestiny.current, "destiny")
          }
        >
          <input type="text" className="search-box" placeholder="Destino" />
        </StandaloneSearchBox>
      </div>

      <GoogleMap
        mapContainerClassName="map-container"
        center={mapCenter}
        zoom={12}
        onLoad={(mapInstance) => setMap(mapInstance)}
        onClick={(event) => {
          const newMarker = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          };
          setMarkers([newMarker]);
        }}
      >
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}
      </GoogleMap>
    </div>
  );
};

GoogleMapSection.propTypes = {
  mapCenter: PropTypes.object.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
};

export default GoogleMapSection;
