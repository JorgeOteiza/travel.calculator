import { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "../styles/map.css";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";
import { loadGoogleMapsScript } from "../utils/loadGoogleMaps";

const GoogleMapSection = ({
  setMapCenter,
  markers,
  setMarkers,
  handleLocationChange,
}) => {
  const mapRef = useRef(null);
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  // Inicializar mapa y autocompletado
  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (!mapRef.current) return;

      const instance = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_MAP_CENTER,
        zoom: 12,
        mapId: import.meta.env.VITE_MAP_ID,
      });

      const renderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
      });
      const service = new window.google.maps.DirectionsService();

      renderer.setMap(instance);
      setMap(instance);
      setDirectionsRenderer(renderer);
      setDirectionsService(service);

      const setupAutocomplete = (inputRef, field) => {
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current
        );
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;

          const coords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          handleLocationChange(field, coords);

          setMarkers((prev) => {
            const updated =
              field === "location"
                ? [coords, prev[1]].filter(Boolean)
                : [prev[0], coords].filter(Boolean);

            const isSame =
              prev.length === updated.length &&
              prev.every(
                (v, i) =>
                  v?.lat === updated[i]?.lat && v?.lng === updated[i]?.lng
              );

            return isSame ? prev : updated;
          });

          if (field === "location") {
            instance.setCenter(coords);
            instance.setZoom(14);
          }
        });
      };

      setupAutocomplete(originInputRef, "location");
      setupAutocomplete(destinationInputRef, "destinity");
    });
  }, [handleLocationChange, setMarkers]);

  // Rutas en el mapa
  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer) return;

    if (markers.length === 2) {
      directionsService.route(
        {
          origin: markers[0],
          destination: markers[1],
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            directionsRenderer.setDirections(result);
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].overview_path.forEach((p) => bounds.extend(p));
            map.fitBounds(bounds);
          } else {
            directionsRenderer.setDirections({ routes: [] });
          }
        }
      );
    } else {
      directionsRenderer.setDirections({ routes: [] });
    }
  }, [markers, map, directionsService, directionsRenderer]);

  // Marcadores
  useEffect(() => {
    if (!map) return;

    const updateMarker = (ref, position, label) => {
      if (!ref.current) {
        ref.current = new window.google.maps.Marker({
          map,
          position,
          label,
        });
      } else {
        const currentPos = ref.current.getPosition();
        if (
          currentPos.lat() !== position.lat ||
          currentPos.lng() !== position.lng
        ) {
          ref.current.setPosition(position);
        }
      }
    };

    if (markers[0]) updateMarker(originMarkerRef, markers[0], "A");
    if (markers[1]) updateMarker(destinationMarkerRef, markers[1], "B");
  }, [markers, map]);

  // Obtener ubicación actual
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        const alreadySet =
          markers[0] &&
          Math.abs(markers[0].lat - current.lat) < 0.0001 &&
          Math.abs(markers[0].lng - current.lng) < 0.0001;

        if (!alreadySet) {
          setMapCenter(current);
          handleLocationChange("location", current);
          setMarkers((prev) => [current, prev[1]].filter(Boolean));
        }

        setLocationDenied(false);

        if (originInputRef.current) {
          originInputRef.current.value = `${current.lat}, ${current.lng}`;
        }
      },
      () => {
        setMapCenter(DEFAULT_MAP_CENTER);
        setLocationDenied(true);
      }
    );
  }, [markers, handleLocationChange, setMapCenter, setMarkers]);

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          <input
            id="origin-input"
            ref={originInputRef}
            placeholder="Ubicación de inicio"
            className="search-box custom-input"
          />
          <input
            id="destiny-input"
            ref={destinationInputRef}
            placeholder="Destino"
            className="search-box custom-input"
          />
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
          ⚠️ Acceso a ubicación denegado. Se muestra Santiago por defecto.
        </div>
      )}

      <div ref={mapRef} className="map-container" />
    </div>
  );
};

GoogleMapSection.propTypes = {
  setMapCenter: PropTypes.func.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
};

export default GoogleMapSection;
