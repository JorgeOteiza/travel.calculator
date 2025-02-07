import PropTypes from "prop-types";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useEffect } from "react";
import "../styles/map.css";

const GoogleMapComponent = ({
  isLoaded,
  loadError,
  mapCenter,
  markers,
  setMarkers,
}) => {
  useEffect(() => {
    if (!markers || markers.length === 0) {
      setMarkers([mapCenter]);
    }
  }, [mapCenter, setMarkers, markers]);

  console.log("📌 Estado del mapa:", { isLoaded, loadError });

  if (loadError) {
    console.error("🚨 Error cargando Google Maps:", loadError);
    return <div>Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div className="map-wrapper">
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
        }}
      >
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}
      </GoogleMap>
    </div>
  );
};

GoogleMapComponent.propTypes = {
  isLoaded: PropTypes.bool.isRequired,
  loadError: PropTypes.object,
  mapCenter: PropTypes.object.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
};

export default GoogleMapComponent;
