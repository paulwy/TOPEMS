import React from "react";
import type { RouteConfig } from "./utils";
import { lazyWithRetry } from "./utils";

const lazy = lazyWithRetry;

const HrmCompanyPage = lazy(() => import("../pages/HrmCompanyPage"));
const HrmDepartmentPage = lazy(() => import("../pages/HrmDepartmentPage"));
const HrmOrganizationPage = lazy(() => import("../pages/HrmOrganizationPage"));
const HrmPositionPage = lazy(() => import("../pages/HrmPositionPage"));
const HrmEmployeePage = lazy(() => import("../pages/HrmEmployeePage"));
const HrmEmployeeDetailPage = lazy(
  () => import("../pages/HrmEmployeeDetailPage"),
);
const HrmLeavePage = lazy(() => import("../pages/HrmLeavePage"));
const HrmContractPage = lazy(() => import("../pages/HrmContractPage"));
const HrmRecruitmentPage = lazy(() => import("../pages/HrmRecruitmentPage"));
const HrmPayrollPage = lazy(() => import("../pages/HrmPayrollPage"));
const HrmPerformancePage = lazy(() => import("../pages/HrmPerformancePage"));
const HrmAttendancePage = lazy(() => import("../pages/HrmAttendancePage"));
const HrmTrainingPage = lazy(() => import("../pages/HrmTrainingPage"));
const HrmReportsPage = lazy(() => import("../pages/HrmReportsPage"));

export const hrmRoutes: RouteConfig[] = [
  {
    path: "/hrm/companies",
    element: React.createElement(HrmCompanyPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/departments",
    element: React.createElement(HrmDepartmentPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/organization",
    element: React.createElement(HrmOrganizationPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/positions",
    element: React.createElement(HrmPositionPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/employees",
    element: React.createElement(HrmEmployeePage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/employee/:id",
    element: React.createElement(HrmEmployeeDetailPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/leave",
    element: React.createElement(HrmLeavePage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/contracts",
    element: React.createElement(HrmContractPage),
    requiredPermissions: ["contract:read"],
    module: "contract",
    action: "read",
  },
  {
    path: "/hrm/recruitment",
    element: React.createElement(HrmRecruitmentPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/payroll",
    element: React.createElement(HrmPayrollPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/performance",
    element: React.createElement(HrmPerformancePage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/attendance",
    element: React.createElement(HrmAttendancePage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/training",
    element: React.createElement(HrmTrainingPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/reports",
    element: React.createElement(HrmReportsPage),
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
];
