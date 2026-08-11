import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import PropTypes from "prop-types";
import "../styles/Navbar.css";

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = Boolean(user);
  const closeMenu = () => setMenuOpen(false);

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
          aria-label="Abrir navegación"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`}
          id="navbarNav"
        >
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/calculadora" onClick={closeMenu}>
                Calculadora
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about" onClick={closeMenu}>
                Acerca de
              </Link>
            </li>
          </ul>

          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="nav-link profile-link" onClick={closeMenu}>
                  👤 {user?.name || "Perfil"}
                </Link>
                <button className="btn navbar-logout" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn navbar-login" onClick={closeMenu}>
                  Ingresar
                </Link>
                <Link to="/register" className="btn navbar-register" onClick={closeMenu}>
                  Crear cuenta
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
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
};

export default Navbar;
