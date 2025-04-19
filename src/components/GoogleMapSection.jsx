import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "../styles/map.css";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";

const GoogleMapSection = ({
  mapCenter,
  setMapCenter,
  markers,
  setMarkers,
  handleLocationChange,
}) => {
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);

  // Inicializar el mapa y servicios
  useEffect(() => {
    if (!window.google || !window.google.maps) return;

    const mapInstance = new window.google.maps.Map(
      document.getElementById("map"),
      {
        center: mapCenter,
        zoom: 12,
        mapId: import.meta.env.VITE_MAP_ID,
      }
    );

    const renderer = new window.google.maps.DirectionsRenderer();
    const service = new window.google.maps.DirectionsService();

    renderer.setMap(mapInstance);
    setMap(mapInstance);
    setDirectionsRenderer(renderer);
    setDirectionsService(service);
  }, [mapCenter]);

  // Trazar ruta
  useEffect(() => {
    if (
      markers.length === 2 &&
      directionsService &&
      directionsRenderer &&
      window.google?.maps
    ) {
      directionsService.route(
        {
          origin: markers[0],
          destination: markers[1],
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            directionsRenderer.setDirections(result);
          } else {
            console.error("Error al calcular ruta:", status);
            directionsRenderer.setDirections({ routes: [] });
          }
        }
      );
    } else if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
    }
  }, [markers, directionsService, directionsRenderer]);

  // Recentrar mapa si cambia el centro
  useEffect(() => {
    if (map && mapCenter) {
      map.setCenter(mapCenter);
    }
  }, [map, mapCenter]);

  // Obtener ubicación actual manualmente
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setMapCenter(current);
          handleLocationChange("location", `${current.lat},${current.lng}`);
          setMarkers((prev) => [current, prev[1]].filter(Boolean));

          const input = document.getElementById("origin-autocomplete");
          if (input) input.value = `${current.lat}, ${current.lng}`;

          setLocationDenied(false);
        },
        () => {
          setMapCenter(DEFAULT_MAP_CENTER);
          setLocationDenied(true);
        }
      );
    } else {
      setMapCenter(DEFAULT_MAP_CENTER);
      setLocationDenied(true);
    }
  }, [handleLocationChange, setMapCenter, setMarkers]);

  // Configurar autocomplete manualmente
  useEffect(() => {
    const setupAutocomplete = (elementId, type) => {
      window.customElements.whenDefined("place-autocomplete").then(() => {
        const el = document.getElementById(elementId);
        if (!el) {
          console.warn(`No se encontró el elemento ${elementId}`);
          return;
        }

        el.addEventListener("gmp-placechange", (event) => {
          const place = event.detail;
          if (!place?.geometry?.location) return;

          const coords = {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };

          if (type === "origin") {
            handleLocationChange("location", `${coords.lat},${coords.lng}`);
            setMarkers((prev) => [coords, prev[1]].filter(Boolean));
            setMapCenter(coords);
          } else {
            handleLocationChange("destinity", `${coords.lat},${coords.lng}`);
            setMarkers((prev) => [prev[0], coords].filter(Boolean));
          }
        });
      });
    };

    setupAutocomplete("origin-autocomplete", "origin");
    setupAutocomplete("destiny-autocomplete", "destiny");
  }, [handleLocationChange, setMarkers, setMapCenter]);

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          <place-autocomplete
            id="origin-autocomplete"
            placeholder="Ubicación de inicio"
            className="search-box"
          ></place-autocomplete>

          <place-autocomplete
            id="destiny-autocomplete"
            placeholder="Destino"
            className="search-box"
          ></place-autocomplete>
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

      <div id="map" className="map-container" />
    </div>
  );
};

GoogleMapSection.propTypes = {
  mapCenter: PropTypes.object.isRequired,
  setMapCenter: PropTypes.func.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
};

export default GoogleMapSection;
