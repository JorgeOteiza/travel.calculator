import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Login.css";
import PropTypes from "prop-types";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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
      const response = await axios.post(`${VITE_BACKEND_URL}/api/login`, form, {
        withCredentials: true,
      });

      if (response.status === 200) {
        const { jwt, user } = response.data;

        localStorage.setItem("token", jwt);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        setTimeout(async () => {
          try {
            const userResponse = await axios.get(
              `${VITE_BACKEND_URL}/api/user`,
              {
                headers: { Authorization: `Bearer ${jwt}` },
                withCredentials: true,
              }
            );

            if (userResponse.status === 200) {
              setUser(userResponse.data);
              navigate("/");
            }
          } catch (error) {
            console.error("🚨 Error al obtener usuario:", error);
          }
        }, 500);
      }
    } catch (error) {
      console.error(
        "🚨 Error al iniciar sesión:",
        error.response?.data || error.message
      );
      setError(error.response?.data?.error || "Error al iniciar sesión.");
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
