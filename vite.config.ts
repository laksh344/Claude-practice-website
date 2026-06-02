import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, stable vendors into their own long-cacheable chunks so no
        // single chunk dominates the critical path and re-deploys don't bust them.
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("framer-motion") || id.includes("node_modules/motion")) return "motion";
        },
      },
    },
  },
});
