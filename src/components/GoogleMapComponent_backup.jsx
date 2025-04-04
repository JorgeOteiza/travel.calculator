import PropTypes from "prop-types";
import {
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import "../styles/map.css";

const GoogleMapSection = ({
  isLoaded,
  mapCenter,
  markers,
  setMapCenter,
  setMarkers,
  handleLocationChange,
}) => {
  const [directions, setDirections] = useState(null);
  const searchBoxRefOrigin = useRef(null);
  const searchBoxRefDestiny = useRef(null);

  // Centrar en ubicación actual al iniciar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const userLocation = { lat: coords.latitude, lng: coords.longitude };
          setMapCenter(userLocation);
          handleLocationChange("location", userLocation);
          setMarkers([userLocation, null]);
        },
        (error) => {
          console.warn("No se pudo obtener la ubicación:", error.message);
        }
      );
    }
  }, [handleLocationChange, setMapCenter, setMarkers]);

  // Dibujar ruta cuando ambos marcadores estén definidos
  useEffect(() => {
    if (markers.length === 2 && markers[0] && markers[1] && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: markers[0],
          destination: markers[1],
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            setDirections(result);
          } else {
            console.error("No se pudo calcular la ruta:", status);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [markers]);

  const onPlacesChanged = (searchBox, type) => {
    if (!searchBox?.getPlaces) return;
    const places = searchBox.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    if (!place.geometry?.location) return;

    const newLocation = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    if (type === "origin") {
      handleLocationChange("location", newLocation);
      setMarkers([newLocation, markers[1]]);
    } else if (type === "destiny") {
      handleLocationChange("destinity", newLocation);
      setMarkers([markers[0], newLocation]);
    }
  };

  const handleMapClick = (event) => {
    const clicked = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    const [origin, destination] = markers;
    if (!origin) {
      handleLocationChange("location", clicked);
      setMarkers([clicked, destination || null]);
    } else if (!destination) {
      handleLocationChange("destinity", clicked);
      setMarkers([origin, clicked]);
    } else {
      handleLocationChange("location", clicked);
      setMarkers([clicked, null]);
    }
  };

  if (!isLoaded) return <div className="loading-maps">Cargando mapa...</div>;

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <Autocomplete
          onLoad={(ref) => (searchBoxRefOrigin.current = ref)}
          onPlacesChanged={() =>
            onPlacesChanged(searchBoxRefOrigin.current, "origin")
          }
        >
          <input
            type="text"
            className="search-box"
            placeholder="Origen (inicio)"
          />
        </Autocomplete>

        <Autocomplete
          onLoad={(ref) => (searchBoxRefDestiny.current = ref)}
          onPlacesChanged={() =>
            onPlacesChanged(searchBoxRefDestiny.current, "destiny")
          }
        >
          <input type="text" className="search-box" placeholder="Destino" />
        </Autocomplete>
      </div>

      <GoogleMap
        mapContainerClassName="map-container"
        center={mapCenter}
        zoom={12}
        onClick={handleMapClick}
      >
        {markers[0] && <Marker position={markers[0]} />}
        {markers[1] && <Marker position={markers[1]} />}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

GoogleMapSection.propTypes = {
  isLoaded: PropTypes.bool.isRequired,
  mapCenter: PropTypes.object.isRequired,
  setMapCenter: PropTypes.func.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
};

export default GoogleMapSection;
