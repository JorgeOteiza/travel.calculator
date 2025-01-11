import PropTypes from "prop-types";
import { GoogleMap, Marker } from "@react-google-maps/api";

const GoogleMapComponent = ({ mapCenter, markers }) => {
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

// ✅ Validación de props
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
