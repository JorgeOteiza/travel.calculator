import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Profile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn(
          "⚠️ No hay token en localStorage, redirigiendo a login..."
        );
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(`${VITE_BACKEND_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error(
          "🚨 Error al obtener usuario:",
          error.response?.data || error.message
        );
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate]);

  if (!user) {
    return <p className="loading">Cargando perfil...</p>;
  }

  return (
    <div className="profile-container">
      <h2>Perfil del Usuario</h2>
      <p>
        <strong>Nombre:</strong> {user.name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <button onClick={() => navigate("/")}>Volver al Inicio</button>
    </div>
  );
};

export default Profile;
