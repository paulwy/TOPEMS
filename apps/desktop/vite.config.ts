import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "../web/src") },
      { find: "@topems/shared-types", replacement: path.resolve(__dirname, "../../packages/shared-types/src") },
      { find: "@topems/shared-utils", replacement: path.resolve(__dirname, "../../packages/shared-utils/src") },
      { find: "@topems/shared-components", replacement: path.resolve(__dirname, "../../packages/shared-components/src") },
      { find: "@topems/shared-hooks", replacement: path.resolve(__dirname, "../../packages/shared-hooks/src") },
      { find: "@topems/tokens", replacement: path.resolve(__dirname, "../../packages/tokens/src") },
    ],
    dedupe: ["react", "react-dom", "scheduler"],
  },
});
