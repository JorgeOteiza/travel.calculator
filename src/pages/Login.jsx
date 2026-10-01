import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import "../styles/Login.css";
import PropTypes from "prop-types";

const Login = ({ setUser }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const applySession = ({ jwt, user }) => {
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isVerifyingGoogle) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, form, {
        withCredentials: true,
        timeout: 15000,
      });

      if (response.status === 200) {
        applySession(response.data);
      }
    } catch (error) {
      let errorMessage = "Error al iniciar sesión.";

      if (error.code === "ECONNABORTED" || !error.response) {
        errorMessage = error.request
          ? "No se pudo conectar con el servidor."
          : "El servidor está tardando más de lo normal. Intenta de nuevo.";
      } else {
        switch (error.response.status) {
          case 401:
            errorMessage = "Correo o contraseña incorrectos.";
            break;
          case 500:
            errorMessage = "Error del servidor. Intenta más tarde.";
            break;
          default:
            errorMessage =
              error.response.data?.error || "Error al iniciar sesión.";
        }
      }

      console.error("🚨 Error al iniciar sesión:", error.response?.data || error.message);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isVerifyingGoogle;

  return (
    <div className="login-container">
      <form
        className="login-form"
        onSubmit={handleSubmit}
        aria-busy={busy}
      >
        <h2>Iniciar Sesión</h2>
        <div aria-live="polite">
          {error && <p className="error-message">{error}</p>}
        </div>
        <input
          type="email"
          name="email"
          placeholder="Correo Electrónico"
          value={form.email}
          onChange={handleChange}
          disabled={busy}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          disabled={busy}
          required
        />
        <button type="submit" disabled={busy}>
          {isSubmitting ? (
            <span className="button-spinner-row">
              <span className="button-spinner" aria-hidden="true" />
              Ingresando…
            </span>
          ) : (
            "Login"
          )}
        </button>

        <div className="auth-divider" role="separator" aria-label="o">
          <span>o</span>
        </div>

        <GoogleSignInButton
          disabled={busy}
          onSuccess={applySession}
          onError={setError}
          onVerifyingChange={setIsVerifyingGoogle}
        />
        {isVerifyingGoogle && (
          <p className="google-signin__status" aria-live="polite">
            <span className="button-spinner" aria-hidden="true" /> Verificando cuenta de Google…
          </p>
        )}
      </form>
    </div>
  );
};

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Login;
