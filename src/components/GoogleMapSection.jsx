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

  // Inicializar mapa y servicios
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
    renderer.setMap(mapInstance);

    setMap(mapInstance);
    setDirectionsRenderer(renderer);
    setDirectionsService(new window.google.maps.DirectionsService());
  }, [mapCenter]);

  // Dibujar ruta si ambos puntos están definidos
  useEffect(() => {
    if (
      directionsService &&
      directionsRenderer &&
      markers.length === 2 &&
      markers[0] &&
      markers[1]
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

  // Obtener ubicación actual y rellenar input
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
          setMarkers([current]);

          const originInput = document.getElementById("origin-autocomplete");
          if (originInput) originInput.value = `${current.lat}, ${current.lng}`;

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
  }, [setMapCenter, setMarkers, handleLocationChange]);

  // Inicializar listeners en los campos de búsqueda
  useEffect(() => {
    const setupAutocompleteListener = (elementId, type) => {
      window.customElements.whenDefined("place-autocomplete").then(() => {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.addEventListener("gmp-placechange", (event) => {
          const place = event.detail;
          if (!place?.geometry?.location) return;

          const coords = {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          };

          if (type === "origin") {
            handleLocationChange("location", `${coords.lat},${coords.lng}`);
            setMarkers(([, dest]) => [coords, dest].filter(Boolean));
            setMapCenter(coords);
          } else {
            handleLocationChange("destinity", `${coords.lat},${coords.lng}`);
            setMarkers(([orig]) => [orig, coords].filter(Boolean));
          }
        });
      });
    };

    setupAutocompleteListener("origin-autocomplete", "origin");
    setupAutocompleteListener("destiny-autocomplete", "destiny");
  }, [handleLocationChange, setMarkers, setMapCenter]);

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          <place-autocomplete
            id="origin-autocomplete"
            placeholder="Ubicación de inicio"
            class="search-box"
          ></place-autocomplete>

          <place-autocomplete
            id="destiny-autocomplete"
            placeholder="Destino"
            class="search-box"
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
