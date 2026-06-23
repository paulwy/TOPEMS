import React, { lazy } from "react";
import type { RouteConfig } from "./utils";

const AIPage = lazy(() => import("../pages/ai/DashboardPage"));
const AiChatPage = lazy(() => import("../pages/ai/AiChatPage"));

export const aiRoutes: RouteConfig[] = [
  {
    path: "/ai",
    element: AIPage,
    requiredPermissions: ["ai:read"],
    module: "ai",
    action: "read",
  },
  {
    path: "/ai/chat",
    element: AiChatPage,
    requiredPermissions: ["ai:read"],
    module: "ai",
    action: "read",
  },
];
