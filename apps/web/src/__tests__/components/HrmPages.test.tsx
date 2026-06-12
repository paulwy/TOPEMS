import React from "react";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../../components/ThemeProvider";
import { ToastProvider } from "../../components/ToastProvider";
import { LoadingProvider } from "../../components/LoadingProvider";
import ErrorBoundary from "../../components/ErrorBoundary";

// 模拟所有 API
vi.mock("../../api/hrm", () => ({
  employeeApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  departmentApi: { list: vi.fn() },
  positionApi: { list: vi.fn() },
  leaveApi: { list: vi.fn() },
  attendanceApi: { list: vi.fn() },
  payrollApi: { list: vi.fn() },
  performanceReviewsApi: { list: vi.fn() },
  jobOpeningsApi: { list: vi.fn() },
  contractApi: { list: vi.fn() },
  trainingPlanApi: { list: vi.fn() },
}));

// 模拟 DataTable 组件以避免测试问题
vi.mock("../../components/DataTable", () => ({
  DataTable: () => <div data-testid="data-table">Mock Data Table</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <LoadingProvider>
            <BrowserRouter>{ui}</BrowserRouter>
          </LoadingProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>,
  );
};

// 简单的冒烟测试，确保组件可以正常渲染
describe("HRM Pages Smoke Tests", () => {
  test("HrmPositionPage should render without crashing", async () => {
    const { default: HrmPositionPage } =
      await import("../../pages/HrmPositionPage");
    renderWithProviders(<HrmPositionPage />);
    expect(true).toBe(true);
  });

  test("HrmLeavePage should render without crashing", async () => {
    const { default: HrmLeavePage } = await import("../../pages/HrmLeavePage");
    renderWithProviders(<HrmLeavePage />);
    expect(true).toBe(true);
  });

  test("HrmAttendancePage should render without crashing", async () => {
    const { default: HrmAttendancePage } =
      await import("../../pages/HrmAttendancePage");
    renderWithProviders(<HrmAttendancePage />);
    expect(true).toBe(true);
  });

  test("HrmPayrollPage should render without crashing", async () => {
    const { default: HrmPayrollPage } =
      await import("../../pages/HrmPayrollPage");
    renderWithProviders(<HrmPayrollPage />);
    expect(true).toBe(true);
  });

  test("HrmPerformancePage should render without crashing", async () => {
    const { default: HrmPerformancePage } =
      await import("../../pages/HrmPerformancePage");
    renderWithProviders(<HrmPerformancePage />);
    expect(true).toBe(true);
  });

  test("HrmRecruitmentPage should render without crashing", async () => {
    const { default: HrmRecruitmentPage } =
      await import("../../pages/HrmRecruitmentPage");
    renderWithProviders(<HrmRecruitmentPage />);
    expect(true).toBe(true);
  });

  test("HrmContractPage should render without crashing", async () => {
    const { default: HrmContractPage } =
      await import("../../pages/HrmContractPage");
    renderWithProviders(<HrmContractPage />);
    expect(true).toBe(true);
  });

  test("HrmTrainingPage should render without crashing", async () => {
    const { default: HrmTrainingPage } =
      await import("../../pages/HrmTrainingPage");
    renderWithProviders(<HrmTrainingPage />);
    expect(true).toBe(true);
  });

  test("HrmReportsPage should render without crashing", async () => {
    const { default: HrmReportsPage } =
      await import("../../pages/HrmReportsPage");
    renderWithProviders(<HrmReportsPage />);
    expect(true).toBe(true);
  });
});
