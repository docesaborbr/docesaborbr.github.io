import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  // A API local já libera http://localhost:8000 por padrão (ORIGENS_PERMITIDAS).
  server: { port: 8000, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        loja: path.resolve(import.meta.dirname, "index.html"),
        admin: path.resolve(import.meta.dirname, "admin.html"),
      },
    },
  },
  // o backend tem a própria suíte (node --test), rodada de dentro de backend/
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
