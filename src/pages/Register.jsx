import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import "../styles/Register.css";
import PropTypes from "prop-types";

const Register = ({ setUser }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      const response = await axios.post(
        `${API_BASE_URL}/api/register`,
        form,
        { withCredentials: true, timeout: 15000 }
      );

      if (response.status === 201) {
        const { jwt, user } = response.data;

        if (!jwt || !user) {
          throw new Error("⚠️ No se recibió un token o usuario válido.");
        }

        applySession(response.data);
      }
    } catch (error) {
      console.error(
        "🚨 Error al registrar:",
        error.response?.data || error.message
      );

      if (error.code === "ECONNABORTED") {
        // El request no llegó a completarse del lado del cliente, pero la
        // cuenta pudo haberse creado igual en el servidor -- no se
        // reintenta el registro automáticamente (podría chocar con un
        // 409 si sí se creó, o generar confusión). Se pide entrar con
        // login en vez de reintentar el registro a ciegas.
        setError(
          "No pudimos confirmar si tu cuenta se creó (el servidor tardó demasiado). " +
            "Intenta iniciar sesión con ese correo y contraseña; si no funciona, regístrate de nuevo."
        );
      } else if (!error.response) {
        setError("No se pudo conectar con el servidor.");
      } else if (error.response.status === 409) {
        setError("❌ El correo ya está registrado. Intenta con otro.");
      } else {
        setError(
          error.response?.data?.error ||
            "⚠️ Error al registrarse. Intenta nuevamente."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isVerifyingGoogle;

  return (
    <div className="register-container">
      <form
        className="register-form"
        onSubmit={handleSubmit}
        aria-busy={busy}
      >
        <h2>Registrarse</h2>
        <div aria-live="polite">
          {error && <p className="error-message">{error}</p>}
        </div>
        <input
          type="text"
          name="name"
          placeholder="Nombre Completo"
          value={form.name}
          onChange={handleChange}
          disabled={busy}
          required
        />
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
              Creando cuenta…
            </span>
          ) : (
            "Registrarse"
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

Register.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Register;
