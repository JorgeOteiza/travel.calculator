import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "../styles/map.css";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";
import { loadGoogleMapsScript } from "../utils/loadGoogleMaps";

const GoogleMapSection = ({
  markers,
  setMarkers,
  onLocationChange,
  mapCenter,
}) => {
  const mapRef = useRef(null);
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  // 🗺️ Inicializar mapa + autocomplete
  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: mapCenter || DEFAULT_MAP_CENTER,
        zoom: 12,
        mapId: import.meta.env.VITE_MAP_ID,
      });

      mapInstanceRef.current = map;

      directionsServiceRef.current = new window.google.maps.DirectionsService();

      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(
        {
          suppressMarkers: true,
        }
      );

      directionsRendererRef.current.setMap(map);

      const setupAutocomplete = (inputRef, field) => {
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ["geometry", "formatted_address", "name"],
          }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place?.geometry?.location) return;

          const coords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          const label = place.formatted_address || place.name || "";

          // ✅ CLAVE: avisar correctamente al formulario
          onLocationChange(field, {
            ...coords,
            label,
          });

          // 📍 actualizar markers
          setMarkers((prev) => {
            const next =
              field === "location" ? [coords, prev[1]] : [prev[0], coords];
            return next.filter(Boolean);
          });

          mapInstanceRef.current.setCenter(coords);
          mapInstanceRef.current.setZoom(14);
        });
      };

      setupAutocomplete(originInputRef, "location");
      setupAutocomplete(destinationInputRef, "destination");
    });
  }, [onLocationChange, mapCenter, setMarkers]);

  // 🧭 Dibujar ruta
  useEffect(() => {
    if (
      markers.length !== 2 ||
      !directionsServiceRef.current ||
      !directionsRendererRef.current
    ) {
      directionsRendererRef.current?.setDirections({ routes: [] });
      return;
    }

    directionsServiceRef.current.route(
      {
        origin: markers[0],
        destination: markers[1],
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          directionsRendererRef.current.setDirections(result);
        }
      }
    );
  }, [markers]);

  // 📍 Marcadores
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const updateMarker = (ref, position, label) => {
      if (!position) return;

      if (!ref.current) {
        ref.current = new window.google.maps.Marker({
          map,
          position,
          label,
        });
      } else {
        ref.current.setPosition(position);
      }
    };

    updateMarker(originMarkerRef, markers[0], "A");
    updateMarker(destinationMarkerRef, markers[1], "B");
  }, [markers]);

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          <input
            ref={originInputRef}
            className="map-input"
            placeholder="Origen"
          />
          <input
            ref={destinationInputRef}
            className="map-input"
            placeholder="Destino"
          />
        </div>
      </div>

      <div ref={mapRef} className="map-container" />
    </div>
  );
};

GoogleMapSection.propTypes = {
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  onLocationChange: PropTypes.func.isRequired,
  mapCenter: PropTypes.object,
};

export default GoogleMapSection;
