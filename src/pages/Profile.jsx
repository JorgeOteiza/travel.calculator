import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import TripCard from "../components/TripCard";
import "../styles/Profile.css";
import PropTypes from "prop-types";

const Profile = ({ user }) => {
  const [trips, setTrips] = useState([]);
  const [sortBy, setSortBy] = useState("reciente");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchTrips = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const res = await axios.get(`${API_BASE_URL}/api/trips`, { headers });
        setTrips(res.data);
      } catch (error) {
        console.error("Error al cargar viajes:", error);
        navigate("/login");
      }
    };

    fetchTrips();
  }, [user, navigate]);

  const sortedTrips = [...trips].sort((a, b) => {
    if (sortBy === "costo") return b.total_cost - a.total_cost;
    if (sortBy === "distancia") return b.distance - a.distance;
    if (sortBy === "reciente" && a.created_at && b.created_at)
      return new Date(b.created_at) - new Date(a.created_at);
    return 0;
  });

  const handleDeleteTrip = (deletedId) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== deletedId));
  };

  return (
    <div className="profile-container">
      {!user ? (
        <p className="profile-loading">Cargando perfil...</p>
      ) : (
        <>
          <h2>Perfil del Usuario</h2>
          <p>
            <strong>Nombre:</strong> {user.name}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>

          <div className="profile-section">
            <h3 className="profile-subtitle">🧭 Historial de Viajes</h3>

            <div className="profile-sort">
              <label htmlFor="orden">Ordenar por:</label>
              <select
                id="orden"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="reciente">Más reciente</option>
                <option value="costo">Mayor costo</option>
                <option value="distancia">Mayor distancia</option>
              </select>
            </div>

            {sortedTrips.length === 0 ? (
              <p className="profile-message">No hay viajes registrados aún.</p>
            ) : (
              <div className="profile-trip-list">
                {sortedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onDelete={handleDeleteTrip}
                  />
                ))}
              </div>
            )}
          </div>

          <button className="btn-back" onClick={() => navigate("/")}>
            Volver al Inicio
          </button>
        </>
      )}
    </div>
  );
};

Profile.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }),
};

export default Profile;
