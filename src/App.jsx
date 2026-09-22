import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Result from "./pages/Result";
import ResultDetails from "./pages/ResultDetails";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import { API_BASE_URL } from "./config/api";
import "./styles/App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setUser(response.data);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <Router>
      <Navbar user={user} setUser={setUser} authLoading={loadingUser} />
      <main className="main-container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/calculadora" element={<Home user={user} setUser={setUser} />} />
          <Route path="/resultado" element={<Result />} />
          <Route path="/resultado/detalles" element={<ResultDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/profile" element={<Profile user={user} authLoading={loadingUser} />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
