import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Register.css";
import PropTypes from "prop-types";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Register = ({ setUser }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post(
        `${VITE_BACKEND_URL}/api/register`,
        form,
        {
          withCredentials: true, // ✅ Permitir autenticación con CORS
        }
      );

      if (response.status === 201) {
        const { jwt, user } = response.data;

        if (!jwt || !user) {
          throw new Error("No se recibió un token o usuario válido.");
        }

        // ✅ Guardar token en localStorage
        localStorage.setItem("token", jwt);
        console.log("✅ Usuario registrado con éxito");
        console.log("🔑 Token guardado en localStorage:", jwt);

        // ✅ Autenticar usuario y redirigir al home
        setUser(user);
        navigate("/");
      }
    } catch (error) {
      console.error(
        "🚨 Error al registrar:",
        error.response?.data || error.message
      );

      if (error.response?.status === 409) {
        setError("El correo ya está registrado. Intenta con otro.");
      } else {
        setError(
          error.response?.data?.error ||
            "Error al registrarse. Intenta nuevamente."
        );
      }
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Registrarse</h2>
        {error && <p className="error-message">{error}</p>}
        <input
          type="text"
          name="name"
          placeholder="Nombre Completo"
          value={form.name}
          onChange={handleChange}
          required
        />
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
        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
};

Register.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Register;
