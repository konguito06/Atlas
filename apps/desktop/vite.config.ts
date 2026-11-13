import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Keep Rust compiler errors visible in the `tauri dev` terminal.
  clearScreen: false,
  server: {
    // Tauri loads the dev server from this fixed port (see tauri.conf.json).
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
