import PropTypes from "prop-types";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const GoogleMapComponent = ({ mapCenter, markers }) => {
  const [map, setMap] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "marker"],
    mapIds: [import.meta.env.VITE_MAP_ID],
  });

  useEffect(() => {
    if (window.google && map) {
      const createMarkers = async () => {
        try {
          const { AdvancedMarkerElement } =
            await window.google.maps.importLibrary("marker");

          markers.forEach((marker, index) => {
            new AdvancedMarkerElement({
              map: map,
              position: marker,
              title: `Marker ${index + 1}`,
            });
          });
        } catch (error) {
          console.error("Error loading Advanced Markers:", error);
        }
      };
      createMarkers();
    }
  }, [map, markers]);

  if (!isLoaded) return <div>Loading Google Maps...</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={12}
      mapId={import.meta.env.VITE_MAP_ID}
      onLoad={(mapInstance) => setMap(mapInstance)}
      options={{
        mapId: import.meta.env.VITE_MAP_ID,
        disableDefaultUI: true, // Opcional, para un diseño más limpio
      }}
    />
  );
};

GoogleMapComponent.propTypes = {
  mapCenter: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default GoogleMapComponent;
