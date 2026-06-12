import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../../components/ToastProvider";
import MigrationAdminPage from "../../pages/MigrationAdminPage";
import type { MigrationService, MigrationStatus } from "../../api/migration";

const mockListServices = vi.fn();
const mockApplyMigration = vi.fn();
const mockRollbackMigration = vi.fn();
const mockGetMigrationStatus = vi.fn();

vi.mock("../../api/migration", () => ({
  migrationApi: {
    listServices: (...args: unknown[]) => mockListServices(...args),
    applyMigration: (...args: unknown[]) => mockApplyMigration(...args),
    rollbackMigration: (...args: unknown[]) => mockRollbackMigration(...args),
    getMigrationStatus: (...args: unknown[]) => mockGetMigrationStatus(...args),
  },
}));

const mockServices: MigrationService[] = [
  {
    name: "iam-service",
    schema: "iam",
    port: 8000,
    tables: 12,
    description: "身份认证服务",
  },
  {
    name: "hrm-service",
    schema: "hrm",
    port: 8011,
    tables: 30,
    description: "人力资源服务",
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>,
  );
};

describe("MigrationAdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListServices.mockResolvedValue([]);
    mockApplyMigration.mockResolvedValue({ files: ["0001_init.sql"] });
    mockRollbackMigration.mockResolvedValue({ record: {} });
    mockGetMigrationStatus.mockResolvedValue({
      pending: [],
      applied: [],
    } as MigrationStatus);
  });

  describe("渲染 / 空状态", () => {
    it("初次渲染展示加载中，随后显示空状态与表头内容", async () => {
      mockListServices.mockResolvedValue([]);
      renderWithProviders(<MigrationAdminPage />);

      expect(screen.getByText(/加载服务列表中/)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/暂无可管理的迁移服务/)).toBeInTheDocument();
      });

      expect(screen.getByText("数据库迁移管理")).toBeInTheDocument();
      expect(mockListServices).toHaveBeenCalledTimes(1);
    });
  });

  describe("渲染 / 有服务列表", () => {
    it("渲染表头（服务名/Schema/端口/表数/描述/状态/操作）与服务行", async () => {
      mockListServices.mockResolvedValue(mockServices);
      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam-service")).toBeInTheDocument();
      });

      const headings = [
        "服务名",
        "Schema",
        "端口",
        "表数",
        "描述",
        "状态",
        "操作",
      ];
      headings.forEach((h) => {
        expect(screen.getAllByText(h).length).toBeGreaterThan(0);
      });

      expect(screen.getByText("hrm")).toBeInTheDocument();
      expect(screen.getByText("身份认证服务")).toBeInTheDocument();
      expect(screen.getByText("人力资源服务")).toBeInTheDocument();
    });
  });

  describe("HTTP 交互", () => {
    it("初次渲染调用 listServices 一次", async () => {
      mockListServices.mockResolvedValue(mockServices);
      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      expect(mockListServices).toHaveBeenCalledTimes(1);
    });

    it('点击"刷新列表"按钮再次调用 listServices', async () => {
      mockListServices.mockResolvedValue(mockServices);
      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole("button", { name: /刷新列表/ });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockListServices).toHaveBeenCalledTimes(2);
      });
    });

    it('点击"生成迁移"触发 applyMigration，随后状态发生切换', async () => {
      mockListServices.mockResolvedValue(mockServices);
      mockApplyMigration.mockResolvedValue({ files: ["0002_add_index.sql"] });
      mockGetMigrationStatus.mockResolvedValue({
        pending: [],
        applied: [
          {
            version: "0002",
            name: "add_index",
            applied_at: "2025-01-01T00:00:00Z",
            duration_ms: 120,
          },
        ],
      } as MigrationStatus);

      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button", { name: /生成迁移/ });
      expect(buttons.length).toBeGreaterThan(0);

      fireEvent.click(buttons[0]);

      await waitFor(() => {
        expect(mockApplyMigration).toHaveBeenCalledTimes(1);
        expect(mockApplyMigration).toHaveBeenCalledWith(
          mockServices[0].name,
          "schema",
        );
      });

      await waitFor(() => {
        expect(mockGetMigrationStatus).toHaveBeenCalled();
      });
    });

    it('点击"回滚"触发 rollbackMigration，并在确认后刷新状态', async () => {
      mockListServices.mockResolvedValue(mockServices);
      mockRollbackMigration.mockResolvedValue({ record: { version: "0003" } });
      mockGetMigrationStatus.mockResolvedValue({
        pending: [],
        applied: [
          {
            version: "0003",
            name: "rollback_me",
            applied_at: "2025-01-01T00:00:00Z",
            duration_ms: 50,
          },
        ],
      } as MigrationStatus);

      // 在 render 之前设置 window.confirm —— jsdom 默认返回 false
      const originalConfirm = window.confirm;
      Object.defineProperty(window, "confirm", {
        value: () => true,
        configurable: true,
        writable: true,
      });

      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      // 先点击"查看状态"来触发 fetchStatusFor，让 statusMap 有数据
      const statusButtons = screen.getAllByRole("button", { name: /查看状态/ });
      await act(async () => {
        fireEvent.click(statusButtons[0]);
      });

      // 等待状态数据被加载
      await waitFor(() => {
        expect(mockGetMigrationStatus).toHaveBeenCalledWith(
          mockServices[0].name,
        );
      });

      // 用 Escape 键关闭 Dialog（触发 onOpenChange 回调）
      await act(async () => {
        fireEvent.keyDown(document.body, { key: "Escape" });
      });

      // 现在 statusMap 有数据了，重新获取回滚按钮
      await waitFor(() => {
        const updatedRollbackButtons = screen
          .getAllByRole("button")
          .filter(
            (b) =>
              b.textContent?.includes("回滚") &&
              !(b as HTMLButtonElement).disabled,
          );
        expect(updatedRollbackButtons.length).toBeGreaterThan(0);
      });

      // 获取可用的回滚按钮
      const allRollbackButtons = screen
        .getAllByRole("button")
        .filter(
          (b) =>
            b.textContent?.includes("回滚") &&
            !(b as HTMLButtonElement).disabled,
        );
      expect(allRollbackButtons.length).toBeGreaterThan(0);

      await act(async () => {
        fireEvent.click(allRollbackButtons[0]);
      });

      await waitFor(() => {
        expect(mockRollbackMigration).toHaveBeenCalledTimes(1);
        expect(mockRollbackMigration).toHaveBeenCalledWith(
          mockServices[0].name,
        );
      });

      Object.defineProperty(window, "confirm", {
        value: originalConfirm,
        configurable: true,
        writable: true,
      });
    });

    it("回滚按钮在 window.confirm 拒绝时不触发 rollbackMigration", async () => {
      mockListServices.mockResolvedValue(mockServices);
      mockGetMigrationStatus.mockResolvedValue({
        pending: [],
        applied: [
          {
            version: "0003",
            name: "rollback_me",
            applied_at: "2025-01-01T00:00:00Z",
            duration_ms: 50,
          },
        ],
      } as MigrationStatus);

      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      const confirmSpy = vi
        .spyOn(window, "confirm")
        .mockImplementation(() => false);

      const allButtons = screen
        .getAllByRole("button")
        .filter((b) => b.textContent?.includes("回滚"));
      const rollbackBtn = allButtons[0] as HTMLButtonElement;
      if (rollbackBtn.disabled) rollbackBtn.removeAttribute("disabled");
      fireEvent.click(rollbackBtn);

      expect(mockRollbackMigration).toHaveBeenCalledTimes(0);
      confirmSpy.mockRestore();
    });
  });

  describe("错误处理", () => {
    it("listServices 失败时展示错误 toast 提示", async () => {
      mockListServices.mockRejectedValue(new Error("网络不可用"));
      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText(/网络不可用/)).toBeInTheDocument();
      });
      expect(mockListServices).toHaveBeenCalledTimes(1);
    });

    it("applyMigration 失败时展示错误 toast 提示", async () => {
      mockListServices.mockResolvedValue(mockServices);
      mockApplyMigration.mockRejectedValue(new Error("迁移执行失败"));

      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button", { name: /生成迁移/ });
      fireEvent.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByText(/迁移执行失败/)).toBeInTheDocument();
      });
      expect(mockApplyMigration).toHaveBeenCalledTimes(1);
    });
  });

  describe("状态对话框", () => {
    it('点击"查看状态"打开 Dialog 并展示 pending / applied 数量', async () => {
      const status: MigrationStatus = {
        pending: ["0003_pending.sql", "0004_pending.sql"],
        applied: [
          {
            version: "0001",
            name: "init",
            applied_at: "2025-01-01T00:00:00Z",
            duration_ms: 100,
          },
          {
            version: "0002",
            name: "add index",
            applied_at: "2025-01-02T00:00:00Z",
            duration_ms: 200,
          },
        ],
      };
      mockListServices.mockResolvedValue(mockServices);
      mockGetMigrationStatus.mockResolvedValue(status);

      renderWithProviders(<MigrationAdminPage />);

      await waitFor(() => {
        expect(screen.getByText("iam")).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button", { name: /查看状态/ });
      expect(buttons.length).toBeGreaterThan(0);

      await userEvent.click(buttons[0]);

      await waitFor(() => {
        expect(mockGetMigrationStatus).toHaveBeenCalledWith(
          mockServices[0].name,
        );
      });

      await waitFor(() => {
        const pendingHeading = screen.getByText(/待执行迁移/);
        expect(pendingHeading).toBeInTheDocument();
      });

      await waitFor(() => {
        const appliedHeading = screen.getByText(/已执行迁移/);
        expect(appliedHeading).toBeInTheDocument();
      });

      status.pending.forEach((file) => {
        expect(screen.getByText(file)).toBeInTheDocument();
      });
      status.applied.forEach((a) => {
        expect(screen.getByText(a.version)).toBeInTheDocument();
      });
    });
  });
});
