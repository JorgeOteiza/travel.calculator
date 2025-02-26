export const getUser = () => {
  const token = localStorage.getItem("jwt");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1])); // Decodificar JWT
    return { username: payload.username }; // Extraer información relevante
  } catch (error) {
    console.error("Error decoding JWT:", error);
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
      localStorage.setItem("jwt", data.jwt);
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
