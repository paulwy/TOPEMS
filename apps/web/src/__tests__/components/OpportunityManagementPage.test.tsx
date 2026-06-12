import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import OpportunityManagementPage from "../../pages/OpportunityManagementPage";

vi.mock("../../api/crm", () => ({
  crmApi: {
    opportunities: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      }),
      create: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

vi.mock("../../store", () => ({
  useAppStore: vi.fn().mockReturnValue({
    addNotification: vi.fn(),
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("OpportunityManagementPage", () => {
  test("renders without crashing", async () => {
    renderWithProviders(<OpportunityManagementPage />);
    await waitFor(() => {
      expect(screen.getByText("商机管理")).toBeInTheDocument();
    });
  });

  test("renders header with title", async () => {
    renderWithProviders(<OpportunityManagementPage />);
    await waitFor(() => {
      expect(screen.getByText("商机管理")).toBeInTheDocument();
    });
  });
});
