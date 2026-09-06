import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@topems/shared-types", replacement: path.resolve(__dirname, "../../packages/shared-types/src") },
      { find: "@topems/shared-utils", replacement: path.resolve(__dirname, "../../packages/shared-utils/src") },
      { find: "@topems/shared-components", replacement: path.resolve(__dirname, "../../packages/shared-components/src") },
      { find: "@topems/shared-hooks", replacement: path.resolve(__dirname, "../../packages/shared-hooks/src") },
      { find: "@topems/api-client", replacement: path.resolve(__dirname, "../../packages/api-client/src") },
      { find: "@topems/tokens", replacement: path.resolve(__dirname, "../../packages/tokens/src") },
      { find: "@topems/app-shell", replacement: path.resolve(__dirname, "../../packages/app-shell/src") },
    ],
    dedupe: ["react", "react-dom", "scheduler"],
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom")) return "router-vendor";
            if (id.includes("@mui")) return "mui-vendor";
            if (id.includes("@tauri-apps")) return "tauri-vendor";
            if (id.includes("lucide-react")) return "icons-vendor";
            if (id.includes("zustand")) return "state-vendor";
            if (id.includes("axios")) return "http-vendor";
            if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
          }
        },
      },
    },
  },
});
