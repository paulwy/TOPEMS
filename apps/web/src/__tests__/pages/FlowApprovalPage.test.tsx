/**
 * FlowApprovalPage 审批管理页面测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";

// Mock 依赖
vi.mock("@/store", () => ({
  useAppStore: vi.fn(() => ({
    addNotification: vi.fn(),
  })),
}));

vi.mock("@/components/templates", () => ({
  ListPageTemplate: vi.fn(({ title, columns, data, loading, filters, pagination, onRowClick, emptyMessage, customActions, renderRowActions }) => (
    <div data-testid="list-page-template">
      <h1 data-testid="page-title">{title}</h1>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="data-count">{data.length}</div>
      <div data-testid="total-count">{pagination?.total || 0}</div>
      {filters?.map((filter: any) => (
        <div key={filter.id} data-testid={`filter-${filter.id}`}>
          {filter.label}
        </div>
      ))}
      {data.map((item: any, index: number) => (
        <div key={item.id || index} data-testid={`row-${index}`}>
          {columns.map((col: any) => (
            <span key={col.id} data-testid={`cell-${col.id}`}>
              {col.render ? col.render(item[col.accessor], item) : item[col.accessor]}
            </span>
          ))}
          {renderRowActions && (
            <div data-testid="row-actions">
              {renderRowActions(item)}
            </div>
          )}
        </div>
      ))}
      {customActions && <div data-testid="custom-actions">{customActions}</div>}
      {data.length === 0 && <div data-testid="empty-message">{emptyMessage}</div>}
    </div>
  )),
}));

vi.mock("@/components/layout", () => ({
  PageHeader: vi.fn(({ title, subtitle, actions }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <span data-testid="page-subtitle">{subtitle}</span>
      {actions && <div data-testid="page-actions">{actions}</div>}
    </div>
  )),
}));

vi.mock("@/components/mui", () => ({
  FilterBar: vi.fn(({ filters }) => (
    <div data-testid="filter-bar">
      {filters?.map((filter: any) => (
        <div key={filter.id} data-testid={`filter-${filter.id}`}>
          {filter.label}
        </div>
      ))}
    </div>
  )),
}));

vi.mock("@/api/flow", () => ({
  flowApi: {
    listApprovals: vi.fn(),
    processApproval: vi.fn(),
  },
}));

import { flowApi } from "@/api/flow";
import { useAppStore } from "@/store";
import { ListPageTemplate, PageHeader } from "@/components/templates";
import { FilterBar } from "@/components/mui";
import FlowApprovalPageRefactored from "@/pages/FlowApprovalPageRefactored";

describe("FlowApprovalPage 审批管理页面", () => {
  const mockApprovals = [
    { id: "1", task_name: "审批任务A", status: "pending", node_id: "node1", approval_type: "single", created_at: "2024-01-01T10:00:00Z" },
    { id: "2", task_name: "审批任务B", status: "approved", node_id: "node2", approval_type: "counter", created_at: "2024-01-02T10:00:00Z" },
  ];

  const mockApiResponse = {
    success: true,
    data: {
      items: mockApprovals,
      total: 2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (flowApi.listApprovals as any).mockResolvedValue(mockApiResponse);
  });

  describe("基本渲染", () => {
    it("应该渲染页面标题", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("page-header")).toBeInTheDocument();
      });
    });

    it("应该渲染审批列表", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("data-count")).toHaveTextContent("2");
      });
    });

    it("应该调用 API 获取数据", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(flowApi.listApprovals).toHaveBeenCalled();
      });
    });
  });

  describe("筛选功能", () => {
    it("应该渲染筛选器", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("filter-search")).toBeInTheDocument();
        expect(screen.getByTestId("filter-status")).toBeInTheDocument();
      });
    });
  });

  describe("分页功能", () => {
    it("应该显示分页信息", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("total-count")).toHaveTextContent("2");
      });
    });
  });

  describe("审批操作", () => {
    it("应该渲染审批操作按钮（通过/拒绝）", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("action-通过")).toBeInTheDocument();
        expect(screen.getByTestId("action-拒绝")).toBeInTheDocument();
      });
    });

    it("应该处理通过操作", async () => {
      (flowApi.processApproval as any).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        const approveButton = screen.getByTestId("action-通过");
        fireEvent.click(approveButton);
      });

      await waitFor(() => {
        expect(screen.getByText("通过审批")).toBeInTheDocument();
      });
    });

    it("应该处理拒绝操作", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        const rejectButton = screen.getByTestId("action-拒绝");
        fireEvent.click(rejectButton);
      });

      await waitFor(() => {
        expect(screen.getByText("拒绝审批")).toBeInTheDocument();
      });
    });
  });

  describe("Tab 切换", () => {
    it("应该渲染待我审批和审批历史 Tab", async () => {
      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("待我审批")).toBeInTheDocument();
        expect(screen.getByText("审批历史")).toBeInTheDocument();
      });
    });
  });

  describe("空状态", () => {
    it("应该显示空状态消息", async () => {
      (flowApi.listApprovals as any).mockResolvedValue({
        success: true,
        data: {
          items: [],
          total: 0,
        },
      });

      render(
        <BrowserRouter>
          <FlowApprovalPageRefactored />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-message")).toHaveTextContent("暂无待审批项");
      });
    });
  });
});
