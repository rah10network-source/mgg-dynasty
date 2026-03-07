import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set base to "/mgg-dynasty/" for GitHub Pages (repo name).
// For local dev, base is "/" — override by setting VITE_BASE env var.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/mgg-dynasty/",
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Keep chunk names predictable for debugging
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
