
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : "/ecommerce/",

  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    open: true,

    allowedHosts: [
      "french-gratified-gigantic.ngrok-free.dev",
    ],

    proxy: {
      "/ecommerce/api": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ecommerce\/api/, ""),
      },
      "/api": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
}));
