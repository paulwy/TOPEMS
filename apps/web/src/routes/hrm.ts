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
    element: HrmCompanyPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/departments",
    element: HrmDepartmentPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/organization",
    element: HrmOrganizationPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/positions",
    element: HrmPositionPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/employees",
    element: HrmEmployeePage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/employee/:id",
    element: HrmEmployeeDetailPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/leave",
    element: HrmLeavePage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/contracts",
    element: HrmContractPage,
    requiredPermissions: ["contract:read"],
    module: "contract",
    action: "read",
  },
  {
    path: "/hrm/recruitment",
    element: HrmRecruitmentPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/payroll",
    element: HrmPayrollPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/performance",
    element: HrmPerformancePage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/attendance",
    element: HrmAttendancePage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/training",
    element: HrmTrainingPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
  {
    path: "/hrm/reports",
    element: HrmReportsPage,
    requiredPermissions: ["hrm:read"],
    module: "hrm",
    action: "read",
  },
];
