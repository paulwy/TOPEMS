import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";

// Mock react-transition-group to fix ES module import issues
vi.mock("react-transition-group", () => {
  return {
    Transition: React.forwardRef(({ children, in: inProp, timeout, onEnter, onExited }: any, ref: any) => {
      if (typeof children === "function") {
        return children({ ref, in: inProp }, {});
      }
      return inProp ? children : null;
    }),
    TransitionGroup: ({ children }: any) => React.createElement(React.Fragment, null, children),
    CSSTransition: React.forwardRef(({ children, in: inProp }: any, ref: any) => {
      if (typeof children === "function") {
        return children({ ref, in: inProp }, {});
      }
      return inProp ? children : null;
    }),
    ReplaceTransition: ({ children, in: inProp }: any) => (inProp ? children : null),
    SwitchTransition: ({ children }: any) => React.createElement(React.Fragment, null, children),
    TransitionGroupContext: React.createContext(null),
  };
});

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
