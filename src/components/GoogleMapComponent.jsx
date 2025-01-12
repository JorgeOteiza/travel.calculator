import PropTypes from "prop-types";
import { GoogleMap } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const GoogleMapComponent = ({ mapCenter, markers }) => {
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (window.google && map) {
      const createMarkers = async () => {
        const { AdvancedMarkerElement } =
          await window.google.maps.importLibrary("marker");
        markers.forEach((marker, index) => {
          new AdvancedMarkerElement({
            map: map,
            position: marker,
            title: `Marker ${index + 1}`,
          });
        });
      };
      createMarkers().catch((error) =>
        console.error("Error loading markers:", error)
      );
    }
  }, [map, markers]);

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={12}
      mapId={import.meta.env.VITE_MAP_ID}
      onLoad={(mapInstance) => setMap(mapInstance)}
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
