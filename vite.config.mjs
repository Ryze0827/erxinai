import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET || "http://127.0.0.1:8080";
  const wayxProxyTarget = env.VITE_DEV_WAYX_PROXY_TARGET || "http://127.0.0.1:8090";
  const imageProxyTarget = env.VITE_DEV_IMAGE_PROXY_TARGET || "https://image.aiwayxx.com";
  return {
    optimizeDeps: {
      include: ["react", "react-dom/client", "react-router"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      proxy: {
        "/wayx": {
          target: wayxProxyTarget,
          changeOrigin: true,
        },
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/v1": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "^/image-api(?:/|$)": {
          target: imageProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/image-api/, ""),
        },
      },
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [react(), tailwindcss()],
  };
});
