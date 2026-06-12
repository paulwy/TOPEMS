import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ContactManagementPage from "../../pages/ContactManagementPage";

vi.mock("../../api/crm", () => ({
  crmApi: {
    contacts: {
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

describe("ContactManagementPage", () => {
  test("renders without crashing", async () => {
    renderWithProviders(<ContactManagementPage />);
    await waitFor(() => {
      expect(screen.getByText("联系人管理")).toBeInTheDocument();
    });
  });

  test("renders header with title", async () => {
    renderWithProviders(<ContactManagementPage />);
    await waitFor(() => {
      expect(screen.getByText("联系人管理")).toBeInTheDocument();
    });
  });
});
