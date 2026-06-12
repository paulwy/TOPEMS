import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import FinanceBudgetPage from "../../pages/FinanceBudgetPage";

vi.mock("../../api/erp", () => ({
  budgetApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
    create: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("../../store", () => ({
  useAppStore: vi.fn().mockReturnValue({
    addNotification: vi.fn(),
  }),
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("FinanceBudgetPage", () => {
  test("renders without crashing", async () => {
    renderWithProviders(<FinanceBudgetPage />);
    await waitFor(() => {
      expect(screen.getByTestId("organization-filter")).toBeInTheDocument();
    });
  });

  test("renders header with title", async () => {
    renderWithProviders(<FinanceBudgetPage />);
    await waitFor(() => {
      expect(screen.getByText("预算管理")).toBeInTheDocument();
    });
  });
});
