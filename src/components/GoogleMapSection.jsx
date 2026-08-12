import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import "../styles/map.css";
import { DEFAULT_MAP_CENTER } from "../constants/googleMaps";
import { loadGoogleMapsScript } from "../utils/loadGoogleMaps";

const GoogleMapSection = ({
  markers,
  setMarkers,
  onLocationChange,
  onRequestLocation,
  onDeclineLocation,
  onCurrentAddressResolved,
  locationStatus,
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
  const geocodedLocationRef = useRef("");

  const routeCalculatedRef = useRef(false);
  const lastPolylineRef = useRef("");
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const latestMapCenterRef = useRef(mapCenter || DEFAULT_MAP_CENTER);
  latestMapCenterRef.current = mapCenter || DEFAULT_MAP_CENTER;

  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: latestMapCenterRef.current,
        zoom: 10,
        mapId: import.meta.env.VITE_MAP_ID,
        zoomControl: false,
        scrollwheel: true,
        gestureHandling: "greedy",
        draggable: true,
        draggableCursor: "grab",
        draggingCursor: "grabbing",
      });

      mapInstanceRef.current = map;
      map.setCenter(latestMapCenterRef.current);

      directionsServiceRef.current = new window.google.maps.DirectionsService();

      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(
        {
          suppressMarkers: true,
        },
      );

      directionsRendererRef.current.setMap(map);

      const setupAutocomplete = (inputRef, field) => {
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ["geometry", "formatted_address", "name"],
            componentRestrictions: { country: "cl" },
            types: ["geocode"],
          },
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place?.geometry?.location) return;

          const coords = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          const label = place.formatted_address || place.name || "";

          onLocationChange(field, { ...coords, label });

          setMarkers((prev) =>
            field === "location" ? [coords, prev[1]] : [prev[0], coords],
          );

          map.setCenter(coords);
          map.setZoom(14);

          routeCalculatedRef.current = false;
        });
      };

      setupAutocomplete(originInputRef, "location");
      setupAutocomplete(destinationInputRef, "destination");
      setMapReady(true);
    }, () => setMapError("No pudimos cargar Google Maps. Revisa la conexión o la clave de API."));
  }, [mapCenter, onLocationChange, setMarkers]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !mapCenter) return;
    const map = mapInstanceRef.current;
    window.google.maps.event.trigger(map, "resize");
    map.panTo(mapCenter);
    map.setZoom(locationStatus === "granted" ? 16 : 10);
  }, [locationStatus, mapCenter, mapReady]);

  useEffect(() => {
    const currentLocation = markers[0];
    if (
      locationStatus !== "granted" ||
      !mapReady ||
      !originInputRef.current ||
      typeof currentLocation?.lat !== "number" ||
      typeof currentLocation?.lng !== "number"
    ) return;

    const locationKey = `${currentLocation.lat},${currentLocation.lng}`;
    if (geocodedLocationRef.current === locationKey) return;
    geocodedLocationRef.current = locationKey;
    originInputRef.current.value = "Buscando dirección…";

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: currentLocation }, (results, status) => {
      const address = status === "OK" && results?.[0]?.formatted_address
        ? results[0].formatted_address
        : `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`;
      if (originInputRef.current) originInputRef.current.value = address;
      onCurrentAddressResolved(address);
    });
  }, [locationStatus, mapReady, markers, onCurrentAddressResolved]);

  useEffect(() => {
    const origin = markers[0];
    const destination = markers[1];

    if (
      typeof origin?.lat !== "number" ||
      typeof origin?.lng !== "number" ||
      typeof destination?.lat !== "number" ||
      typeof destination?.lng !== "number" ||
      !directionsServiceRef.current ||
      !directionsRendererRef.current
    ) {
      routeCalculatedRef.current = false;
      return;
    }

    if (routeCalculatedRef.current) return;

    routeCalculatedRef.current = true;

    console.log("🧭 Calculando ruta", { origin, destination });

    directionsServiceRef.current.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        console.log("📡 Directions callback:", status);

        if (status !== "OK" || !result?.routes?.length) {
          routeCalculatedRef.current = false;
          return;
        }

        directionsRendererRef.current.setDirections(result);

        const route = result.routes[0];

        // 🔥 FIX REAL AQUÍ
        const encodedPolyline = route?.overview_polyline;

        console.log("🧵 Polyline:", encodedPolyline);

        if (!encodedPolyline) {
          console.error("❌ NO polyline");
          return;
        }

        if (encodedPolyline === lastPolylineRef.current) return;

        lastPolylineRef.current = encodedPolyline;

        onLocationChange("route_polyline", encodedPolyline);
      },
    );
  }, [markers, onLocationChange, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const updateMarker = (ref, position, label) => {
      if (typeof position?.lat !== "number" || typeof position?.lng !== "number") return;

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
  }, [markers, mapReady]);

  const changeZoom = (amount) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentZoom = map.getZoom() ?? 12;
    map.setZoom(Math.min(21, Math.max(3, currentZoom + amount)));
  };

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          <input
            ref={originInputRef}
            className="map-input"
            placeholder="Ubicación de inicio"
          />
          <input
            ref={destinationInputRef}
            className="map-input"
            placeholder="Destino"
          />
          {locationStatus !== "idle" && (
            <button
              type="button"
              className="location-button"
              onClick={onRequestLocation}
              disabled={locationStatus === "loading"}
              title="Usar mi ubicación actual"
              aria-label="Usar mi ubicación actual"
            >
              <span aria-hidden="true">⌖</span>
              {locationStatus === "loading" ? "Ubicando…" : "Mi ubicación"}
            </button>
          )}
        </div>
      </div>

      {locationStatus === "idle" && (
        <div className="location-consent" role="dialog" aria-label="Ubicación actual">
          <div>
            <strong>¿Quieres usar tu ubicación actual?</strong>
            <p>El mapa ya muestra Santiago. Puedes mantenerla o centrarlo donde estás.</p>
          </div>
          <div className="location-consent-actions">
            <button type="button" className="location-decline" onClick={onDeclineLocation}>
              Ahora no
            </button>
            <button type="button" className="location-accept" onClick={onRequestLocation}>
              Usar mi ubicación
            </button>
          </div>
        </div>
      )}

      {(locationStatus === "denied" || locationStatus === "unsupported") && (
        <div className="location-notice" role="status">
          Mostrando Santiago. Puedes buscar otro origen o intentar tu ubicación nuevamente.
        </div>
      )}

      <div ref={mapRef} className="map-container" />
      {mapReady && (
        <div className="map-zoom-controls" aria-label="Controles de zoom">
          <button type="button" onClick={() => changeZoom(1)} aria-label="Acercar mapa" title="Acercar">
            +
          </button>
          <button type="button" onClick={() => changeZoom(-1)} aria-label="Alejar mapa" title="Alejar">
            −
          </button>
        </div>
      )}
      {mapError && <div className="map-error" role="alert">{mapError}</div>}
    </div>
  );
};

GoogleMapSection.propTypes = {
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  onLocationChange: PropTypes.func.isRequired,
  onRequestLocation: PropTypes.func.isRequired,
  onDeclineLocation: PropTypes.func.isRequired,
  onCurrentAddressResolved: PropTypes.func.isRequired,
  locationStatus: PropTypes.oneOf([
    "idle",
    "loading",
    "granted",
    "denied",
    "unsupported",
    "dismissed",
  ]).isRequired,
  mapCenter: PropTypes.object,
};

export default GoogleMapSection;
