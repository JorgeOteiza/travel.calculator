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
  const mapInstanceRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const autocompleteTimersRef = useRef({});
  const sessionTokensRef = useRef({});
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const geocodedLocationRef = useRef("");

  const routeCalculatedRef = useRef(false);
  const lastPolylineRef = useRef("");
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [searchValues, setSearchValues] = useState({ location: "", destination: "" });
  const [predictions, setPredictions] = useState({ location: [], destination: [] });
  const [activeSearch, setActiveSearch] = useState(null);
  const [activeIndex, setActiveIndex] = useState({ location: -1, destination: -1 });
  const latestMapCenterRef = useRef(mapCenter || DEFAULT_MAP_CENTER);
  latestMapCenterRef.current = mapCenter || DEFAULT_MAP_CENTER;

  useEffect(() => () => {
    Object.values(autocompleteTimersRef.current).forEach(window.clearTimeout);
  }, []);

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
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
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
      typeof currentLocation?.lat !== "number" ||
      typeof currentLocation?.lng !== "number"
    ) return;

    const locationKey = `${currentLocation.lat},${currentLocation.lng}`;
    if (geocodedLocationRef.current === locationKey) return;
    geocodedLocationRef.current = locationKey;
    setSearchValues((current) => ({ ...current, location: "Buscando dirección…" }));

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: currentLocation }, (results, status) => {
      const address = status === "OK" && results?.[0]?.formatted_address
        ? results[0].formatted_address
        : `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`;
      setSearchValues((current) => ({ ...current, location: address }));
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
      if (typeof position?.lat !== "number" || typeof position?.lng !== "number") {
        if (ref.current) {
          ref.current.setMap(null);
          ref.current = null;
        }
        return;
      }

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

  const handleSearchChange = (field, value) => {
    const markerIndex = field === "location" ? 0 : 1;
    if (typeof markers[markerIndex]?.lat === "number") {
      // El usuario edita el texto tras una selección ya confirmada: esas
      // coordenadas ya no corresponden a lo escrito, hay que invalidarlas.
      setMarkers((current) => (
        field === "location" ? [null, current[1]] : [current[0], null]
      ));
      onLocationChange(field, null);
      routeCalculatedRef.current = false;
    }
    setSearchValues((current) => ({ ...current, [field]: value }));
    setActiveSearch(field);
    setActiveIndex((current) => ({ ...current, [field]: -1 }));
    window.clearTimeout(autocompleteTimersRef.current[field]);
    if (value.trim().length < 3 || !autocompleteServiceRef.current) {
      setPredictions((current) => ({ ...current, [field]: [] }));
      return;
    }
    autocompleteTimersRef.current[field] = window.setTimeout(() => {
      if (!sessionTokensRef.current[field]) sessionTokensRef.current[field] = new window.google.maps.places.AutocompleteSessionToken();
      autocompleteServiceRef.current.getPlacePredictions({ input: value.trim(), componentRestrictions: { country: "cl" }, sessionToken: sessionTokensRef.current[field] }, (items, status) => {
        const matches = status === window.google.maps.places.PlacesServiceStatus.OK ? items || [] : [];
        setPredictions((current) => ({ ...current, [field]: matches.slice(0, 5) }));
      });
    }, 300);
  };

  const selectPrediction = (field, prediction) => {
    if (!placesServiceRef.current) return;
    placesServiceRef.current.getDetails({ placeId: prediction.place_id, fields: ["geometry", "formatted_address", "name"], sessionToken: sessionTokensRef.current[field] }, (place, status) => {
      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) return;
      const coords = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      const label = place.formatted_address || place.name || prediction.description;
      setSearchValues((current) => ({ ...current, [field]: label }));
      setPredictions((current) => ({ ...current, [field]: [] }));
      setActiveIndex((current) => ({ ...current, [field]: -1 }));
      setActiveSearch(null);
      sessionTokensRef.current[field] = null;
      onLocationChange(field, { ...coords, label });
      setMarkers((current) => field === "location" ? [coords, current[1]] : [current[0], coords]);
      mapInstanceRef.current.panTo(coords);
      mapInstanceRef.current.setZoom(14);
      routeCalculatedRef.current = false;
    });
  };

  const handleFieldKeyDown = (field, event) => {
    const items = predictions[field];

    if (event.key === "ArrowDown") {
      if (!items.length) return;
      event.preventDefault();
      setActiveIndex((current) => ({
        ...current,
        [field]: Math.min((current[field] ?? -1) + 1, items.length - 1),
      }));
      return;
    }

    if (event.key === "ArrowUp") {
      if (!items.length) return;
      event.preventDefault();
      setActiveIndex((current) => ({
        ...current,
        [field]: Math.max((current[field] ?? -1) - 1, 0),
      }));
      return;
    }

    if (event.key === "Enter") {
      // Enter solo confirma la sugerencia resaltada por teclado; nunca
      // selecciona la primera de la lista a ciegas (evita destinos ambiguos).
      event.preventDefault();
      const index = activeIndex[field];
      if (index >= 0 && items[index]) selectPrediction(field, items[index]);
      return;
    }

    if (event.key === "Escape") {
      setPredictions((current) => ({ ...current, [field]: [] }));
      setActiveIndex((current) => ({ ...current, [field]: -1 }));
    }
  };

  const renderAddressField = (field, placeholder) => {
    const isConfirmed = typeof markers[field === "location" ? 0 : 1]?.lat === "number";

    return (
      <div className="map-address-field">
        <input
          className={`map-input${isConfirmed ? " is-confirmed" : ""}`}
          value={searchValues[field]}
          onChange={(event) => handleSearchChange(field, event.target.value)}
          onFocus={() => setActiveSearch(field)}
          onBlur={() => window.setTimeout(() => setActiveSearch(null), 180)}
          onKeyDown={(event) => handleFieldKeyDown(field, event)}
          placeholder={placeholder}
          autoComplete="off"
          inputMode="search"
          aria-autocomplete="list"
          aria-expanded={activeSearch === field && predictions[field].length > 0}
        />
        {activeSearch === field && predictions[field].length > 0 && (
          <ul className="map-address-suggestions" role="listbox">
            {predictions[field].map((prediction, index) => (
              <li key={prediction.place_id} role="option" aria-selected={index === activeIndex[field]}>
                <button
                  type="button"
                  className={index === activeIndex[field] ? "is-active" : ""}
                  onPointerDown={(event) => { event.preventDefault(); selectPrediction(field, prediction); }}
                  onMouseEnter={() => setActiveIndex((current) => ({ ...current, [field]: index }))}
                >
                  <strong>{prediction.structured_formatting?.main_text || prediction.description}</strong>
                  <small>{prediction.structured_formatting?.secondary_text || "Chile"}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <div className="search-inputs">
          {renderAddressField("location", "Ubicación de inicio")}
          {renderAddressField("destination", "Destino")}
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
