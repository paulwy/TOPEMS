import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "react-transition-group", replacement: path.resolve(__dirname, "../../node_modules/react-transition-group") },
      { find: "react-transition-group/cjs", replacement: path.resolve(__dirname, "../../node_modules/react-transition-group/cjs") },
      { find: "react-transition-group/TransitionGroupContext", replacement: path.resolve(__dirname, "../../node_modules/react-transition-group/cjs/TransitionGroupContext.js") },
    ],
    dedupe: ["react", "react-dom", "scheduler"],
  },
  ssr: {
    noExternal: ["react-transition-group"],
  },
});
