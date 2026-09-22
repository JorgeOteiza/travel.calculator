import { useCallback, useEffect, useRef, useState } from "react";
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
  // Último DirectionsResult renderizado con éxito. DirectionsRenderer ya
  // ajusta el viewport automáticamente al llamar setDirections() (no se
  // configuró preserveViewport, así que su valor por defecto -- false --
  // sigue activo; verificado contra la API real de Google, no solo por
  // documentación). Guardamos el resultado para poder volver a invocar ESE
  // mismo ajuste ya existente cuando cambie el tamaño del contenedor, en
  // vez de escribir un fitBounds propio que compita con él.
  const lastDirectionsResultRef = useRef(null);
  // Identificador incremental de la solicitud de ruta vigente. Se captura
  // al iniciar cada llamada a DirectionsService.route() y se compara dentro
  // de su callback: si ya no coincide (porque se invalidó una dirección, se
  // inició una solicitud más nueva, o el componente se desmontó), la
  // respuesta se descarta por completo sin tocar ningún estado.
  const routeRequestIdRef = useRef(0);
  // true mientras estamos moviendo la cámara nosotros mismos (panTo/setZoom/
  // setDirections programáticos) -- así los listeners de dragstart/
  // zoom_changed no confunden esos movimientos con una interacción real del
  // usuario.
  const isProgrammaticCameraUpdateRef = useRef(false);
  // Profundidad de actualizaciones programáticas de cámara en curso (no un
  // booleano): si dos llamadas a withProgrammaticCameraUpdate se solapan,
  // el "idle" de la primera solo debe bajar SU propio conteo -- la bandera
  // isProgrammaticCameraUpdateRef no vuelve a false hasta que la
  // profundidad llega a 0, así el "idle" de la primera nunca libera
  // prematuramente la protección de la segunda.
  const programmaticCameraUpdateDepthRef = useRef(0);
  // Listeners "idle" temporales + temporizadores de respaldo todavía
  // pendientes de resolverse, para poder liberarlos todos de una sola vez
  // si el componente se desmonta antes de que se resuelvan por sí solos.
  const pendingCameraReleasesRef = useRef(new Set());
  // true si el usuario ajustó manualmente la cámara (arrastre, rueda,
  // pellizco o los botones +/-) desde el último encuadre automático. Se
  // reinicia cuando se calcula una ruta nueva con éxito o cuando la ruta
  // actual se invalida -- un encuadre automático nuevo sí debe "reclamar"
  // la cámara.
  const userAdjustedCameraRef = useRef(false);
  // Último tamaño de contenedor observado, para descartar variaciones
  // triviales de layout que no ameritan reencuadrar nada.
  const lastObservedSizeRef = useRef(null);
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

  // Al desmontar, invalida cualquier solicitud de ruta que siga en vuelo
  // (su callback, si llega tarde, comparará su id contra este contador ya
  // incrementado y se descartará sin tocar nada) y libera de inmediato
  // cualquier listener "idle"/temporizador de respaldo de
  // withProgrammaticCameraUpdate que siga pendiente, para que ninguno de
  // los dos siga vivo tocando refs después de desmontar.
  useEffect(() => () => {
    routeRequestIdRef.current += 1;
    pendingCameraReleasesRef.current.forEach((release) => release());
  }, []);

  // Ejecuta una actualización de cámara "nuestra" (panTo/setZoom/
  // setDirections) sin que los listeners de dragstart/zoom_changed la
  // confundan con una interacción manual del usuario.
  //
  // Google Maps no aplica estos cambios de forma síncrona: el ajuste de
  // viewport interno de setDirections() dispara center_changed/zoom_changed
  // varios milisegundos después de la llamada (verificado contra la API
  // real: entre 6 y 20 ms según el caso) -- un setTimeout(fn, 0) anterior
  // liberaba la bandera ANTES de que esos eventos llegaran, y el listener
  // de zoom_changed los confundía con una interacción manual real. En su
  // lugar, se usa el evento "idle" que la propia API dispara cuando el mapa
  // termina de asentarse tras el cambio, registrado ANTES de iniciar el
  // movimiento para no perder un "idle" que llegue casi de inmediato.
  //
  // Como una operación que no produce ningún cambio efectivo de cámara
  // puede no disparar "idle" en absoluto (verificado contra la API real:
  // reinvocar setDirections() con un resultado cuyo encuadre ya coincide
  // con el actual no generó ningún evento), un temporizador de respaldo --
  // NO el mecanismo principal, solo una red de seguridad para ese caso
  // límite -- libera la bandera de todos modos si "idle" nunca llega.
  const withProgrammaticCameraUpdate = (updateFn) => {
    const map = mapInstanceRef.current;
    if (!map) {
      updateFn();
      return;
    }

    programmaticCameraUpdateDepthRef.current += 1;
    isProgrammaticCameraUpdateRef.current = true;

    let released = false;
    let idleListener = null;
    let safetyTimer = null;

    const release = () => {
      if (released) return;
      released = true;
      idleListener?.remove();
      window.clearTimeout(safetyTimer);
      pendingCameraReleasesRef.current.delete(release);
      programmaticCameraUpdateDepthRef.current = Math.max(0, programmaticCameraUpdateDepthRef.current - 1);
      if (programmaticCameraUpdateDepthRef.current === 0) {
        isProgrammaticCameraUpdateRef.current = false;
      }
    };

    pendingCameraReleasesRef.current.add(release);
    idleListener = map.addListener("idle", release);
    safetyTimer = window.setTimeout(release, 800);

    updateFn();
  };

  // Invalida por completo la ruta actual en TODAS sus representaciones:
  // descarta cualquier solicitud en vuelo (bump del id), borra el dibujo en
  // el mapa (DirectionsRenderer no tiene un clear() dedicado; set(
  // "directions", null) es el mecanismo documentado y ya verificado contra
  // la API real), la referencia guardada para reencuadrar en resize, la
  // bandera de "ruta calculada", la de interacción manual, y el
  // route_polyline del formulario -- reutilizando el mismo onLocationChange
  // y el mismo patrón data===null que ya usa el resto del componente.
  const clearRoute = useCallback(() => {
    routeRequestIdRef.current += 1;
    routeCalculatedRef.current = false;
    lastDirectionsResultRef.current = null;
    userAdjustedCameraRef.current = false;
    directionsRendererRef.current?.set("directions", null);
    if (lastPolylineRef.current) {
      lastPolylineRef.current = "";
      onLocationChange("route_polyline", null);
    }
  }, [onLocationChange]);

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
    withProgrammaticCameraUpdate(() => {
      map.panTo(mapCenter);
      map.setZoom(locationStatus === "granted" ? 16 : 10);
    });
  }, [locationStatus, mapCenter, mapReady]);

  // Distingue interacción manual real (arrastre, rueda/pellizco de zoom) de
  // los movimientos de cámara que el propio componente dispara
  // (withProgrammaticCameraUpdate marca esos como no-manuales). Los botones
  // +/- del propio mapa (changeZoom) marcan la bandera directamente porque,
  // aunque el código es "nuestro", sí representan una intención real del
  // usuario.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return undefined;
    const map = mapInstanceRef.current;

    const markManualInteraction = () => {
      if (!isProgrammaticCameraUpdateRef.current) {
        userAdjustedCameraRef.current = true;
      }
    };

    const dragListener = map.addListener("dragstart", markManualInteraction);
    const zoomListener = map.addListener("zoom_changed", markManualInteraction);

    return () => {
      dragListener.remove();
      zoomListener.remove();
    };
  }, [mapReady]);

  // Mantiene la ruta calculada correctamente encuadrada cuando cambia el
  // tamaño real del CONTENEDOR (rotación del teléfono, cambio de layout,
  // etc.) -- Google Maps no vuelve a calcular el zoom óptimo por sí solo
  // ante un simple "resize" (verificado contra la API real: el trigger de
  // resize por sí solo deja el zoom sin cambios). Sí lo hace si se le
  // vuelve a pasar el mismo DirectionsResult a setDirections(), que es el
  // mismo ajuste automático que Google ya aplica al calcular una ruta por
  // primera vez -- no un fitBounds nuevo que compita con él. Si todavía no
  // hay una ruta calculada, solo se dispara el "resize" normal, igual que
  // hace el efecto anterior.
  //
  // Dos salvaguardas sobre ese comportamiento: (1) ResizeObserver dispara
  // ante CUALQUIER cambio de tamaño, incluidos ajustes triviales de layout
  // (menos de RESIZE_SIGNIFICANCE_THRESHOLD_PX de diferencia) que no
  // ameritan reencuadrar nada; (2) si el usuario ya ajustó la cámara
  // manualmente desde el último encuadre automático, un resize no debe
  // deshacer esa exploración -- solo se redibujan los tiles ("resize"
  // crudo) sin volver a invocar setDirections().
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !mapRef.current) return undefined;
    if (typeof ResizeObserver === "undefined") return undefined;

    const RESIZE_SIGNIFICANCE_THRESHOLD_PX = 24;
    const map = mapInstanceRef.current;
    let debounceTimer = null;

    const handleContainerResize = (entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        // Se compara contra el último tamaño para el que efectivamente se
        // procesó un cambio (no contra la observación inmediatamente
        // anterior, que se descartaba igual si era trivial): así, varias
        // variaciones pequeñas y sucesivas siguen acumulándose contra ese
        // mismo punto de referencia fijo hasta que la diferencia total supera
        // el umbral, en vez de reiniciar la comparación en cada observación
        // y perder el acumulado. La referencia se actualiza aquí
        // independientemente de si más abajo se reencuadra o no (sin ruta
        // vigente, o con la cámara ya ajustada manualmente), porque lo que
        // describe es el tamaño del contenedor, no si el mapa se reencuadró.
        const reference = lastObservedSizeRef.current;
        const isTrivialChange = reference
          && Math.abs(width - reference.width) < RESIZE_SIGNIFICANCE_THRESHOLD_PX
          && Math.abs(height - reference.height) < RESIZE_SIGNIFICANCE_THRESHOLD_PX;
        if (isTrivialChange) return;

        lastObservedSizeRef.current = { width, height };

        window.google.maps.event.trigger(map, "resize");

        if (userAdjustedCameraRef.current) return;

        if (lastDirectionsResultRef.current) {
          withProgrammaticCameraUpdate(() => {
            directionsRendererRef.current?.setDirections(lastDirectionsResultRef.current);
          });
        }
      }, 200);
    };

    const observer = new ResizeObserver(handleContainerResize);
    observer.observe(mapRef.current);

    return () => {
      window.clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [mapReady]);

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
      // Cubre cualquier vía por la que origin/destination dejen de ser
      // válidos (no solo handleSearchChange/selectPrediction, que ya llaman
      // a clearRoute() por su cuenta) -- p.ej. si el padre resetea markers
      // directamente. clearRoute() es seguro de invocar aunque ya no haya
      // ruta que limpiar.
      if (routeCalculatedRef.current || lastDirectionsResultRef.current) {
        clearRoute();
      }
      return;
    }

    if (routeCalculatedRef.current) return;

    routeCalculatedRef.current = true;

    console.log("🧭 Calculando ruta", { origin, destination });

    routeRequestIdRef.current += 1;
    const requestId = routeRequestIdRef.current;

    directionsServiceRef.current.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        console.log("📡 Directions callback:", status);

        // Respuesta fuera de orden, de una dirección ya editada, o llegada
        // tras el desmontaje: se descarta sin tocar ningún estado (ni el
        // mapa, ni las refs, ni el formulario).
        if (requestId !== routeRequestIdRef.current) return;

        if (status !== "OK" || !result?.routes?.length) {
          clearRoute();
          return;
        }

        withProgrammaticCameraUpdate(() => {
          directionsRendererRef.current.setDirections(result);
        });
        lastDirectionsResultRef.current = result;
        // Una ruta nueva calculada con éxito sí debe reclamar la cámara:
        // su propio encuadre automático es el punto de partida correcto.
        userAdjustedCameraRef.current = false;

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
  }, [markers, onLocationChange, mapReady, clearRoute]);

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
      clearRoute();
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
      withProgrammaticCameraUpdate(() => {
        mapInstanceRef.current.panTo(coords);
        mapInstanceRef.current.setZoom(14);
      });
      clearRoute();
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
