import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, MAP_ID } from "../main.jsx";
import PropTypes from "prop-types";

const MapContainer = ({ mapCenter, markers }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    mapIds: [MAP_ID],
  });

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={12}
    >
      {markers.map((marker, index) => (
        <Marker key={index} position={marker} />
      ))}
    </GoogleMap>
  );
};
MapContainer.propTypes = {
  mapCenter: PropTypes.object.isRequired,
  markers: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default MapContainer;
