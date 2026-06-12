import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Suppress unhandled promise rejection warnings in tests
process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error && reason.message === "Network error") {
    // Expected in some tests - suppress
    return;
  }
  console.warn("Unhandled Rejection:", reason);
});
