import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      "process.env": env,
    },
    server: {
      proxy: {
        "/api/carsxe": {
          target: "https://api.carsxe.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/carsxe/, ""),
        },
      },
    },
  };
});
