import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { offlineCache } from "./utils/offlineCache";

const Root: React.FC = () => {
  useEffect(() => {
    offlineCache.init();
  }, []);

  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);