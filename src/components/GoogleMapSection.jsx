import PropTypes from "prop-types";
import {
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useState, useRef, useEffect, useCallback } from "react";
import "../styles/map.css";

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 }; // Santiago, Chile

const GoogleMapSection = ({
  isLoaded,
  mapCenter,
  setMapCenter,
  markers,
  setMarkers,
  handleLocationChange,
}) => {
  const [directions, setDirections] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const searchBoxRefOrigin = useRef(null);
  const searchBoxRefDestiny = useRef(null);
  const originInputRef = useRef(null);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation && window.google) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: current }, (results, status) => {
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address;
              if (originInputRef.current) {
                originInputRef.current.value = address;
              }
            } else {
              console.warn("No se pudo obtener la dirección:", status);
            }
          });

          setMapCenter(current);
          handleLocationChange("location", current);
          setMarkers([current]);
          setLocationDenied(false);
        },
        () => {
          console.warn("📛 Usuario denegó acceso a ubicación.");
          setLocationDenied(true);
          setMapCenter(DEFAULT_CENTER);
        }
      );
    } else {
      console.warn("⚠️ Geolocalización no está disponible.");
      setLocationDenied(true);
    }
  }, [handleLocationChange, setMapCenter, setMarkers]);

  useEffect(() => {
    if (markers.length === 2) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: markers[0],
          destination: markers[1],
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error("Error al trazar ruta:", status);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [markers]);

  const handlePlaceChanged = (searchBox, type) => {
    const place = searchBox.getPlace?.();
    if (!place?.geometry?.location) return;

    const newCoords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    if (type === "origin") {
      handleLocationChange("location", newCoords);
      setMarkers((prev) => [newCoords, prev[1]].filter(Boolean));
      setMapCenter(newCoords);
    } else {
      handleLocationChange("destinity", newCoords);
      setMarkers((prev) => [prev[0], newCoords].filter(Boolean));
    }
  };

  if (!isLoaded)
    return <div className="loading-maps">Cargando Google Maps...</div>;

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          <Autocomplete
            onLoad={(ref) => (searchBoxRefOrigin.current = ref)}
            onPlaceChanged={() =>
              handlePlaceChanged(searchBoxRefOrigin.current, "origin")
            }
          >
            <input
              ref={originInputRef}
              type="text"
              className="search-box"
              placeholder="Ubicación de inicio"
            />
          </Autocomplete>

          <Autocomplete
            onLoad={(ref) => (searchBoxRefDestiny.current = ref)}
            onPlaceChanged={() =>
              handlePlaceChanged(searchBoxRefDestiny.current, "destiny")
            }
          >
            <input type="text" className="search-box" placeholder="Destino" />
          </Autocomplete>
        </div>

        <button
          className="gps-button"
          onClick={getCurrentLocation}
          title="Usar mi ubicación actual"
        >
          📍
        </button>
      </div>

      {locationDenied && (
        <div className="location-warning">
          ⚠️ Acceso a ubicación denegado. Se mostrará Santiago por defecto.
        </div>
      )}

      <GoogleMap
        mapContainerClassName="map-container"
        center={mapCenter}
        zoom={12}
        onClick={(event) => {
          const newMarker = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          };
          setMarkers([newMarker]);
          setMapCenter(newMarker);
        }}
      >
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}
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
