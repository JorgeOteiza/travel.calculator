import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import PropTypes from "prop-types";
import "../styles/Navbar.css";

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const isAuthenticated = !!user;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
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

          <div className="d-flex gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="nav-link text-light fw-bold">
                  👤 {user?.name || "Perfil"}
                </Link>
                <button
                  className="btn btn-outline-danger w-auto mt-0"
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
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
};

export default Navbar;
