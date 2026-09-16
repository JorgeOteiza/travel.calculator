import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (command === "build" && !env.VITE_BACKEND_URL) {
    throw new Error(
      "VITE_BACKEND_URL no está definida. Configúrala como variable de entorno " +
        "de build antes de ejecutar `vite build` (en Cloudflare Pages: " +
        "Settings → Environment variables)."
    );
  }

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_BACKEND_URL": JSON.stringify(env.VITE_BACKEND_URL),
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(
        env.VITE_GOOGLE_MAPS_API_KEY
      ),
      "import.meta.env.VITE_MAP_ID": JSON.stringify(env.VITE_MAP_ID),
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
