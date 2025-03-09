import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Register.css";
import PropTypes from "prop-types";

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
        "http://localhost:5000/api/register",
        form
      );

      if (response.status === 201) {
        const { jwt } = response.data;

        if (!jwt) {
          throw new Error("No se recibió un token válido.");
        }

        // ✅ Guardar correctamente el token en localStorage
        localStorage.setItem("token", jwt);
        console.log("✅ Usuario registrado con éxito");
        console.log("🔑 Token guardado en localStorage:", jwt);

        // ✅ Esperar a que el token esté en localStorage y obtener el usuario
        setTimeout(async () => {
          try {
            const userResponse = await axios.get(
              "http://localhost:5000/api/user",
              {
                headers: { Authorization: `Bearer ${jwt}` },
              }
            );

            if (userResponse.status === 200) {
              setUser(userResponse.data);
              console.log(
                "✅ Usuario autenticado automáticamente:",
                userResponse.data
              );
              navigate("/");
            }
          } catch (error) {
            console.error(
              "🚨 Error al obtener usuario después del registro:",
              error
            );
          }
        }, 500); // Esperamos 500ms para asegurarnos de que el token ya está guardado
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
