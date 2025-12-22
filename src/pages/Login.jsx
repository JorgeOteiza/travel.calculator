import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "../styles/Login.css";
import PropTypes from "prop-types";

const Login = ({ setUser }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, form, {
        withCredentials: true,
      });

      if (response.status === 200) {
        const { jwt, user } = response.data;

        localStorage.setItem("token", jwt);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        navigate("/");
      }
    } catch (error) {
      console.error(
        "🚨 Error al iniciar sesión:",
        error.response?.data || error.message
      );

      // Mensajes de error más específicos
      let errorMessage = "Error al iniciar sesión.";

      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = "Correo o contraseña incorrectos.";
            break;
          case 404:
            errorMessage = "Usuario no encontrado.";
            break;
          case 500:
            errorMessage = "Error del servidor. Intenta más tarde.";
            break;
          default:
            errorMessage =
              error.response.data?.error || "Error al iniciar sesión.";
        }
      } else if (error.request) {
        errorMessage = "No se pudo conectar con el servidor.";
      }

      setError(errorMessage);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>
        {error && <p className="error-message">{error}</p>}
        <input
          type="email"
          name="email"
          placeholder="Correo Electrónico"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Login;
