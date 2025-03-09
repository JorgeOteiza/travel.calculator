import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import PropTypes from "prop-types";
import axios from "axios";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    // ✅ Se usa AbortController para evitar llamadas innecesarias si el usuario cambia de página
    const controller = new AbortController();

    axios
      .get(`${VITE_BACKEND_URL}/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((response) => {
        setUser(response.data);
        setIsAuthenticated(true);
      })
      .catch((error) => {
        console.error(
          "🚨 Error al obtener usuario:",
          error.response?.data || error.message
        );
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUser(null);
      });

    return () => controller.abort(); // ✅ Se limpia la petición si cambia de página
  }, [setUser]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid mx-4">
        <Link className="navbar-brand" to="/">
          Travel Calculator
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">
                About
              </Link>
            </li>
          </ul>

          <div className="d-flex gap-2 text-nowrap">
            {isAuthenticated ? (
              <>
                {/* 🔹 Ahora el nombre del usuario es un enlace a "/profile" */}
                <Link
                  to="/profile"
                  className="nav-link text-light fw-bold"
                  style={{ cursor: "pointer" }}
                >
                  👤 {user?.name || "Perfil"}
                </Link>
                <button
                  className="btn btn-outline-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-light">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
  }),
  setUser: PropTypes.func.isRequired,
};

export default Navbar;
