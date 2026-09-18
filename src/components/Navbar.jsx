import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import PropTypes from "prop-types";
import {
  FaArrowRightFromBracket,
  FaCalculator,
  FaCircleInfo,
  FaUser,
  FaUserPlus,
} from "react-icons/fa6";
import "../styles/Navbar.css";

const Navbar = ({ user, setUser, authLoading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = Boolean(user);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    closeMenu();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid navbar-shell">
        <Link className="navbar-brand" to="/" onClick={closeMenu}>
          Travel Calculator
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-controls="navbarNav"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"}
        >
          <span className="navbar-toggler-lines" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>

        <div className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`} id="navbarNav">
          <div className="navbar-menu-heading">
            <span>Menú principal</span>
            <small>Planifica y revisa tus viajes</small>
          </div>

          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/calculadora" onClick={closeMenu}>
                <span className="nav-link-icon"><FaCalculator /></span>
                <span><strong>Calculadora</strong><small>Crea una nueva estimación</small></span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/about" onClick={closeMenu}>
                <span className="nav-link-icon"><FaCircleInfo /></span>
                <span><strong>Acerca del proyecto</strong><small>Conoce cómo funciona el cálculo</small></span>
              </NavLink>
            </li>
          </ul>

          <div className="navbar-actions">
            {authLoading ? null : isAuthenticated ? (
              <>
                <NavLink to="/profile" className={({ isActive }) => `nav-link profile-link${isActive ? " active" : ""}`} onClick={closeMenu}>
                  <FaUser /> <span>{user?.name || "Mi perfil"}</span>
                </NavLink>
                <button className="btn navbar-logout" onClick={handleLogout}>
                  <FaArrowRightFromBracket /> Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn navbar-login" onClick={closeMenu}>
                  <FaUser /> Ingresar
                </Link>
                <Link to="/register" className="btn navbar-register" onClick={closeMenu}>
                  <FaUserPlus /> Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>

        {menuOpen && (
          <button type="button" className="navbar-menu-backdrop" aria-label="Cerrar menú" onClick={closeMenu} />
        )}
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
  authLoading: PropTypes.bool.isRequired,
};

export default Navbar;
