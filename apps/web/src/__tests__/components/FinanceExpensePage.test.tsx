import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import FinanceExpensePage from "../../pages/FinanceExpensePage";

vi.mock("../../api/erp", () => ({
  expenseApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("../../api/hrm", () => ({
  employeeApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
  },
  companyApi: {
    list: vi.fn().mockResolvedValue({
      code: 200,
      data: { items: [], total: 0 },
    }),
  },
}));

vi.mock("../../store", () => ({
  useAppStore: vi.fn().mockReturnValue({
    addNotification: vi.fn(),
  }),
}));

vi.mock("../../components/DataTable", () => ({
  DataTable: () => <div data-testid="data-table">Mock Data Table</div>,
}));

vi.mock("../../components/EnhancedDataTable", () => ({
  EnhancedDataTable: () => (
    <div data-testid="data-table">Mock Enhanced Data Table</div>
  ),
}));

vi.mock("../../components/ui/OrganizationFilter", () => ({
  default: () => <div data-testid="organization-filter" />,
}));

vi.mock("../../components/MetricCard", () => ({
  MetricCard: ({ title }: { title: string }) => (
    <div data-testid={`metric-${title}`}>{title}</div>
  ),
}));

vi.mock("../../components/StatsChart", () => ({
  StatsChart: ({ type }: { type: string }) => (
    <div data-testid={`chart-${type}`}>Chart</div>
  ),
}));

vi.mock("../../components/ModeToggle", () => ({
  ModeToggle: () => <button data-testid="mode-toggle">Toggle</button>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("FinanceExpensePage", () => {
  test("renders without crashing", async () => {
    renderWithProviders(<FinanceExpensePage />);
    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
    });
  });

  test("renders header with title", async () => {
    renderWithProviders(<FinanceExpensePage />);
    await waitFor(() => {
      expect(screen.getByText("费用报销")).toBeInTheDocument();
    });
  });
});
