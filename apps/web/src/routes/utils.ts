import type { ComponentType, LazyExoticComponent, ReactElement } from "react";
import type React from "react";
import { lazy } from "react";
import ErrorPage from "../pages/shared/ErrorPage";

export const lazyWithRetry = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> => {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.error("Failed to load component:", error);
      return { default: ErrorPage as unknown as T };
    }
  });
};

export interface RouteConfig {
  path: string;
  element: ReactElement | LazyExoticComponent<ComponentType<any>>;
  requiredPermissions?: string[];
  module?: string;
  action?: "read" | "write" | "update" | "delete" | "admin";
}
