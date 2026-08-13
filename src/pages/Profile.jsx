import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { API_BASE_URL } from "../config/api";
import TripCard from "../components/TripCard";
import { formatCLP } from "../utils/currency";
import { formatDistance, formatLiters } from "../utils/numberFormat";
import "../styles/Profile.css";

const Profile = ({ user, authLoading }) => {
  const [trips, setTrips] = useState([]);
  const [sortBy, setSortBy] = useState("reciente");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    const fetchTrips = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/api/trips`, { headers: { Authorization: `Bearer ${token}` } });
        setTrips(Array.isArray(response.data) ? response.data : []);
      } catch {
        setError("No pudimos cargar tu historial. Inténtalo nuevamente más tarde.");
      } finally { setLoading(false); }
    };
    fetchTrips();
  }, [user, authLoading, navigate]);

  const sortedTrips = useMemo(() => [...trips].sort((a, b) => {
    if (sortBy === "costo") return b.total_cost - a.total_cost;
    if (sortBy === "distancia") return b.distance - a.distance;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  }), [trips, sortBy]);

  const totals = useMemo(() => trips.reduce((summary, trip) => ({
    distance: summary.distance + Number(trip.distance || 0),
    fuel: summary.fuel + Number(trip.fuel_consumed || 0),
    cost: summary.cost + Number(trip.total_cost || 0),
  }), { distance: 0, fuel: 0, cost: 0 }), [trips]);

  if (authLoading || !user) return <div className="profile-loading">Cargando perfil…</div>;

  return <div className="profile-page">
    <header className="profile-hero"><div className="profile-avatar" aria-hidden="true">{user.name?.charAt(0).toUpperCase()}</div><div><span>Tu historial de estimaciones</span><h1>{user.name}</h1><p>{user.email}</p></div><Link to="/calculadora">Calcular nuevo viaje</Link></header>
    <section className="profile-stats"><article><span>Viajes guardados</span><strong>{trips.length}</strong></article><article><span>Distancia acumulada</span><strong>{formatDistance(totals.distance)} km</strong></article><article><span>Combustible estimado</span><strong>{formatLiters(totals.fuel)} L</strong></article><article><span>Costo estimado total</span><strong>{formatCLP(totals.cost)}</strong></article></section>
    <section className="profile-history">
      <div className="history-heading"><div><span>Historial</span><h2>Tus viajes calculados</h2></div><div className="history-controls"><div className="view-toggle" role="group" aria-label="Vista del historial"><button type="button" className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} aria-label="Vista de cuadrícula" title="Vista de cuadrícula"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg></button><button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="Vista de lista" title="Vista de lista"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h3v3H4zm5 0h11v3H9zM4 10.5h3v3H4zm5 0h11v3H9zM4 16h3v3H4zm5 0h11v3H9z"/></svg></button></div><label htmlFor="orden">Ordenar por<select id="orden" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="reciente">Más reciente</option><option value="costo">Mayor costo</option><option value="distancia">Mayor distancia</option></select></label></div></div>
      {error && <div className="profile-error" role="alert">{error}</div>}
      {loading ? <div className="profile-skeleton"><span/><span/><span/></div> : sortedTrips.length === 0 ? <div className="profile-empty"><span>🧭</span><h3>Aún no tienes viajes guardados</h3><p>Tu próxima estimación aparecerá aquí con su ruta, costo y análisis detallado.</p><Link to="/calculadora">Crear primera estimación</Link></div> : <div className={`profile-trip-list ${viewMode === "list" ? "is-list" : ""}`}>{sortedTrips.map((trip) => <TripCard key={trip.id} trip={trip} viewMode={viewMode} onDelete={(id) => setTrips((current) => current.filter((item) => item.id !== id))} />)}</div>}
    </section>
  </div>;
};

Profile.propTypes = { user: PropTypes.shape({ name: PropTypes.string.isRequired, email: PropTypes.string.isRequired }), authLoading: PropTypes.bool.isRequired };
export default Profile;
