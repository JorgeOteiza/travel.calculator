export const getUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Manejar respuesta no JSON
      throw new Error(errorData.error || "No autorizado");
    }

    const data = await response.json();
    console.log("✅ Respuesta:", data);
    return data;
  } catch (error) {
    console.error("🚨 Error obteniendo usuario:", error.message);
    return null;
  }
};

export const login = async (credentials) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      }
    );

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("jwt");
      return data;
    } else {
      throw new Error(data.error || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem("jwt");
};
