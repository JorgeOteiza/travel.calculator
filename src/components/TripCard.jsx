import { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/TripCard.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const TripCard = ({ trip, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${VITE_BACKEND_URL}/api/trips/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onDelete(trip.id);
    } catch (error) {
      console.error("Error al eliminar viaje:", error);
      alert("No se pudo eliminar el viaje.");
    } finally {
      setDeleting(false);
      setShowModal(false);
    }
  };

  return (
    <motion.div
      className="trip-card"
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
          <strong>Distancia:</strong> {trip.distance} km
        </li>
        <li>
          <strong>Combustible:</strong> {trip.fuel_consumed} L
        </li>
        <li>
          <strong>Costo:</strong> ${trip.total_cost}
        </li>
        <li>
          <strong>Precio/Litro:</strong> ${trip.fuel_price}
        </li>
        <li>
          <strong>Pasajeros:</strong> {trip.passengers}
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
                <strong>Peso total:</strong> {trip.total_weight} kg
              </li>
              <li>
                <strong>Clima:</strong> {trip.weather}
              </li>
              <li>
                <strong>Pendiente:</strong> {trip.road_grade}%
              </li>
              <li>
                <strong>Ubicación:</strong> {trip.location}
              </li>
            </motion.div>
          )}
        </AnimatePresence>
      </ul>

      <div className="trip-actions">
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ocultar detalles" : "Ver más"}
        </button>
        <button className="delete-btn" onClick={() => setShowModal(true)}>
          Eliminar
        </button>
      </div>

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
              <h4>¿Estás segura?</h4>
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
};

export default TripCard;
