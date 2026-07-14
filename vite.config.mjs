import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    optimizeDeps: {
      include: ["react", "react-dom/client", "react-router-dom"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY_TARGET || "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [react()],
  };
});
