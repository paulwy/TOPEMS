import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { createPermissionInterceptor } from "./api/permissionInterceptor";
import { queryClient } from "./lib/react-query";

createPermissionInterceptor();

window.addEventListener("permission-denied", (event: Event) => {
  const customEvent = event as CustomEvent;
  console.warn("Permission denied:", customEvent.detail);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
