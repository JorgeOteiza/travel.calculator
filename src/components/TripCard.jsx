import { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../styles/TripCard.css";
import { formatCLP } from "../utils/currency";
import { formatDistance, formatLiters, formatPercentage, formatWeight } from "../utils/numberFormat";
import { getDrivingStyleLabel, getWeatherLabel } from "../utils/tripLabels";

import { API_BASE_URL } from "../config/api";
import { tripToResult } from "../utils/tripResultAdapter";

const isCoordinateLabel = (value = "") => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());

const compactLocation = (value) => {
  if (!value || isCoordinateLabel(value)) return "";
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
};

const TripCard = ({ trip, onDelete, viewMode }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const originLabel = compactLocation(trip.origin_label);
  const destinationLabel = compactLocation(trip.destination_label);
  const hasRouteLabels = Boolean(originLabel && destinationLabel);
  const routeReference = hasRouteLabels
    ? `${originLabel} → ${destinationLabel}`
    : "Ruta sin nombres guardados";
  const fullRoute = hasRouteLabels
    ? `${trip.origin_label} → ${trip.destination_label}`
    : "Este viaje se guardó antes de incorporar nombres de origen y destino.";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/trips/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onDelete(trip.id);
    } catch (error) {
      console.error("Error al eliminar viaje:", error);
      setDeleteError("No se pudo eliminar el viaje. Inténtalo nuevamente.");
    } finally {
      setDeleting(false);
      setShowModal(false);
    }
  };

  return (
    <motion.div
      className={`trip-card ${viewMode === "list" ? "trip-card-list" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
    >
      <div className="trip-header">
        <h4>
          {trip.brand} {trip.model} ({trip.year})
        </h4>
        <span>{new Date(trip.created_at).toLocaleDateString()}</span>
      </div>

      <ul className="trip-list">
        <li>
          <strong>Distancia:</strong> {formatDistance(trip.distance)} km
        </li>
        <li>
          <strong>Combustible:</strong> {formatLiters(trip.fuel_consumed)} L
        </li>
        <li>
          <strong>Costo:</strong> {formatCLP(trip.total_cost)}
        </li>
        <li>
          <strong>Precio/Litro:</strong><span className="fuel-price-detail">{formatCLP(trip.fuel_price)} {trip.fuel_octane && <small>{trip.fuel_octane.replace("gasoline_", "")} oct.</small>}</span>
        </li>
        <li>
          <strong>Pasajeros:</strong> {trip.passengers}
        </li>
        <li>
          <strong>Ruta:</strong>
          <span className="trip-location-summary" title={fullRoute}>{routeReference}</span>
        </li>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <li>
                <strong>Peso total:</strong> {formatWeight(trip.total_weight)} kg
              </li>
              <li>
                <strong>Clima:</strong> {getWeatherLabel(trip.weather)}
              </li>
              <li>
                <strong>Conducción:</strong> {getDrivingStyleLabel(trip.driving_style)}
              </li>
              <li>
                <strong>Pendiente:</strong> {formatPercentage(trip.road_grade)}%
              </li>
            </motion.div>
          )}
        </AnimatePresence>
      </ul>

      <div className="trip-actions">
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ocultar detalles" : "Ver más"}
        </button>
        <button onClick={() => navigate("/resultado/detalles", { state: { result: tripToResult(trip) } })}>
          Ver análisis completo
        </button>
        <button className="delete-btn" onClick={() => setShowModal(true)}>
          Eliminar
        </button>
      </div>
      {deleteError && <p className="trip-delete-error" role="alert">{deleteError}</p>}

      {/* MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h4>¿Eliminar este viaje?</h4>
              <p>Esta acción eliminará el viaje permanentemente.</p>
              <div className="modal-buttons">
                <button onClick={() => setShowModal(false)}>Cancelar</button>
                <button
                  className="delete-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando..." : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

TripCard.propTypes = {
  trip: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
  viewMode: PropTypes.oneOf(["grid", "list"]).isRequired,
};

export default TripCard;
