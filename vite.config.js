import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/carsxe": {
        target: "https://api.carsxe.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/carsxe/, ""),
      },
    },
  },
});
