import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import axios from "axios";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import "./styles/app.css";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_LIBRARIES = ["places"];


function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await axios.get(`${VITE_BACKEND_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log("✅ Usuario obtenido:", response.data);
        setUser(response.data);
      } catch (error) {
        console.error(
          "🚨 Error al obtener usuario:",
          error.response?.data || error.message
        );
      }
    };

    fetchUser();
  }, []);


  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  

  if (loadError) return <div>Error al cargar Google Maps</div>;

  return (
    <Router>
      <Navbar user={user} setUser={setUser} />
      <main className="main-container">
        <Routes>
          <Route path="/" element={<Home user={user} isLoaded={isLoaded} />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/profile" element={<Profile user={user} />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
