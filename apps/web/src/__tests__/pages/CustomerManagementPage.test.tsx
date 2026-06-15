/**
 * CustomerManagementPage 客户管理页面测试
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
  ListPageTemplate: vi.fn(({ title, columns, data, loading, filters, pagination, onRowClick, rowActions, emptyMessage, selection, batchActions }) => (
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
          {rowActions && (
            <div data-testid="row-actions">
              {rowActions.map((action: any, i: number) => (
                <button key={i} data-testid={`action-${action.label}`} onClick={() => action.onClick(item)}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {batchActions && (
        <div data-testid="batch-actions">
          {batchActions.map((action: any, i: number) => (
            <button key={i} data-testid={`batch-action-${action.label}`}>
              {action.label}
            </button>
          ))}
        </div>
      )}
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

vi.mock("@/api/crm", () => ({
  crmApi: {
    customers: {
      list: vi.fn(),
      delete: vi.fn(),
    },
  },
  type Customer: vi.fn(),
}));

import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { ListPageTemplate, PageHeader } from "@/components/templates";
import { FilterBar } from "@/components/mui";
import CustomerManagementPage from "@/pages/CustomerManagementPageRefactored";

describe("CustomerManagementPage 客户管理页面", () => {
  const mockCustomers = [
    { id: "1", name: "客户A", code: "C001", industry: "IT", contact_name: "张三", phone: "13800000001", status: "active" },
    { id: "2", name: "客户B", code: "C002", industry: "Finance", contact_name: "李四", phone: "13800000002", status: "inactive" },
  ];

  const mockApiResponse = {
    success: true,
    data: {
      items: mockCustomers,
      total: 2,
      page: 1,
      page_size: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (crmApi.customers.list as any).mockResolvedValue(mockApiResponse);
  });

  describe("基本渲染", () => {
    it("应该渲染页面标题", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("page-header")).toBeInTheDocument();
      });
    });

    it("应该渲染客户列表", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("data-count")).toHaveTextContent("2");
      });
    });

    it("应该调用 API 获取数据", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(crmApi.customers.list).toHaveBeenCalled();
      });
    });
  });

  describe("筛选功能", () => {
    it("应该渲染所有筛选器", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("filter-search")).toBeInTheDocument();
        expect(screen.getByTestId("filter-status")).toBeInTheDocument();
        expect(screen.getByTestId("filter-industry")).toBeInTheDocument();
      });
    });
  });

  describe("分页功能", () => {
    it("应该显示分页信息", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("total-count")).toHaveTextContent("2");
      });
    });
  });

  describe("行操作", () => {
    it("应该渲染行操作按钮", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("action-查看")).toBeInTheDocument();
        expect(screen.getByTestId("action-编辑")).toBeInTheDocument();
        expect(screen.getByTestId("action-删除")).toBeInTheDocument();
      });
    });

    it("应该处理查看操作", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const viewButton = screen.getByTestId("action-查看");
        fireEvent.click(viewButton);
      });

      await waitFor(() => {
        expect(screen.getByText("客户详情")).toBeInTheDocument();
      });
    });

    it("应该处理删除操作", async () => {
      window.confirm = vi.fn(() => true);
      (crmApi.customers.delete as any).mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const deleteButton = screen.getByTestId("action-删除");
        fireEvent.click(deleteButton);
      });

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe("批量操作", () => {
    it("应该渲染批量操作按钮", async () => {
      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("batch-action-批量删除")).toBeInTheDocument();
        expect(screen.getByTestId("batch-action-批量导出")).toBeInTheDocument();
      });
    });
  });

  describe("空状态", () => {
    it("应该显示空状态消息", async () => {
      (crmApi.customers.list as any).mockResolvedValue({
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
        },
      });

      render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-message")).toHaveTextContent("暂无客户数据");
      });
    });
  });
});
