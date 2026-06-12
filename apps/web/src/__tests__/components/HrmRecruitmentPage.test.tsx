import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HrmRecruitmentPage from "../../pages/HrmRecruitmentPage";

vi.mock("../../api/hrm", () => ({
  jobOpeningApi: {
    list: vi.fn().mockResolvedValue({
      code: 200,
      data: { items: [], total: 0 },
    }),
    create: vi.fn().mockResolvedValue({ code: 200 }),
    update: vi.fn().mockResolvedValue({ code: 200 }),
    delete: vi.fn().mockResolvedValue({ code: 200 }),
  },
  candidateApi: {
    list: vi.fn().mockResolvedValue({
      code: 200,
      data: { items: [], total: 0 },
    }),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({
      code: 200,
      data: { items: [], total: 0 },
    }),
  },
}));

vi.mock("../../hooks/useNotification", () => ({
  useNotification: vi.fn().mockReturnValue({
    success: vi.fn(),
    error: vi.fn(),
    notifications: [],
    hideNotification: vi.fn(),
  }),
}));

vi.mock("../../components/NotificationContainer", () => ({
  NotificationContainer: () => <div data-testid="notification-container" />,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("HrmRecruitmentPage", () => {
  test("renders without crashing", async () => {
    renderWithProviders(<HrmRecruitmentPage />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-container")).toBeInTheDocument();
    });
  });

  test("renders header with title", async () => {
    renderWithProviders(<HrmRecruitmentPage />);
    await waitFor(() => {
      expect(screen.getByText("招聘管理")).toBeInTheDocument();
    });
  });
});
