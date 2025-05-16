import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_BACKEND_URL": JSON.stringify(env.VITE_BACKEND_URL),
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(
        env.VITE_GOOGLE_MAPS_API_KEY
      ),
      "import.meta.env.VITE_MAP_ID": JSON.stringify(env.VITE_MAP_ID),
      "import.meta.env.VITE_OPENWEATHERMAP_API_KEY": JSON.stringify(
        env.VITE_OPENWEATHERMAP_API_KEY
      ),
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
