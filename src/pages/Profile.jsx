import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TripCard from "../components/TripCard";
import "../styles/Profile.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Profile = () => {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [sortBy, setSortBy] = useState("reciente");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndTrips = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [userRes, tripsRes] = await Promise.all([
          axios.get(`${VITE_BACKEND_URL}/api/user`, { headers }),
          axios.get(`${VITE_BACKEND_URL}/api/trips`, { headers }),
        ]);

        setUser(userRes.data);
        setTrips(tripsRes.data);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchUserAndTrips();
  }, [navigate]);

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
                  <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
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

export default Profile;
