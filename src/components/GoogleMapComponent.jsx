import PropTypes from "prop-types";
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useRef, useState, useEffect } from "react";
import "../styles/map.css";

const GoogleMapComponent = ({
  isLoaded,
  mapCenter,
  markers,
  setMarkers,
  handleLocationChange,
}) => {
  // Removed unused map state
  const [directions, setDirections] = useState(null);
  const [clickCount, setClickCount] = useState(0);

  const searchBoxRefOrigin = useRef(null);
  const searchBoxRefDestiny = useRef(null);

  const drawRoute = (origin, destination) => {
    if (!origin || !destination || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        } else {
          console.error("Error al trazar ruta:", status);
        }
      }
    );
  };

  useEffect(() => {
    if (markers.length === 2) {
      drawRoute(markers[0], markers[1]);
    }
  }, [markers]);

  const onPlacesChanged = (searchBox, type) => {
    if (!searchBox?.getPlaces) return;
    const places = searchBox.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    if (!place.geometry?.location) return;

    const newLocation = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    if (type === "origin") {
      handleLocationChange("location", newLocation);
      setMarkers((prev) => [newLocation, prev[1]].filter(Boolean));
    } else if (type === "destiny") {
      handleLocationChange("destinity", newLocation);
      setMarkers((prev) => [prev[0], newLocation].filter(Boolean));
    }
  };

  const handleMapClick = (event) => {
    const clicked = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    const field = clickCount % 2 === 0 ? "location" : "destinity";
    handleLocationChange(field, clicked);

    if (clickCount % 2 === 0) {
      setMarkers([clicked]);
    } else {
      setMarkers((prev) => [prev[0], clicked]);
    }

    setClickCount((prev) => prev + 1);
  };

  if (!isLoaded) {
    return <div className="loading-maps">Loading Google Maps...</div>;
  }

  return (
    <div className="map-wrapper">
      <div className="search-container">
        <StandaloneSearchBox
          onLoad={(ref) => (searchBoxRefOrigin.current = ref)}
          onPlacesChanged={() =>
            onPlacesChanged(searchBoxRefOrigin.current, "origin")
          }
        >
          <input
            type="text"
            className="search-box"
            placeholder="Choose start location..."
          />
        </StandaloneSearchBox>

        <StandaloneSearchBox
          onLoad={(ref) => (searchBoxRefDestiny.current = ref)}
          onPlacesChanged={() =>
            onPlacesChanged(searchBoxRefDestiny.current, "destiny")
          }
        >
          <input
            type="text"
            className="search-box"
            placeholder="Choose destination..."
          />
        </StandaloneSearchBox>
      </div>

      <GoogleMap
        mapContainerClassName="map-container"
        center={mapCenter}
        zoom={12}
        // Removed onLoad handler as map state is unused
        onClick={handleMapClick}
      >
        {markers.map((marker, index) => (
          <Marker key={index} position={marker} />
        ))}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#4285F4",
                strokeWeight: 5,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

GoogleMapComponent.propTypes = {
  isLoaded: PropTypes.bool.isRequired,
  mapCenter: PropTypes.object.isRequired,
  markers: PropTypes.array.isRequired,
  setMarkers: PropTypes.func.isRequired,
  handleLocationChange: PropTypes.func.isRequired,
  routePolyline: PropTypes.string, // Para uso futuro si deseas dibujar por coordenadas
};

export default GoogleMapComponent;
