/**
 * PmContractListPage 合同列表页面测试
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
  ListPageTemplate: vi.fn(({ title, columns, data, loading, filters, pagination, onRowClick, rowActions, emptyMessage }) => (
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
  type FilterConfig: vi.fn(),
}));

vi.mock("@/api/pm", () => ({
  contractApi: {
    list: vi.fn(),
  },
}));

import { contractApi } from "@/api/pm";
import { useAppStore } from "@/store";
import { ListPageTemplate, PageHeader } from "@/components/templates";
import { FilterBar } from "@/components/mui";
import PmContractListPage from "@/pages/PmContractListPageRefactored";

describe("PmContractListPage 合同列表页面", () => {
  const mockContracts = [
    { id: "1", name: "合同A", code: "C001", type: "project", amount: 100000, status: "approved", sign_date: "2024-01-01", expire_date: "2025-01-01" },
    { id: "2", name: "合同B", code: "C002", type: "purchase", amount: 50000, status: "pending", sign_date: "2024-02-01", expire_date: "2024-08-01" },
  ];

  const mockApiResponse = {
    code: 200,
    data: {
      items: mockContracts,
      total: 2,
      page: 1,
      page_size: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (contractApi.list as any).mockResolvedValue(mockApiResponse);
  });

  describe("基本渲染", () => {
    it("应该渲染页面标题", async () => {
      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("page-header")).toBeInTheDocument();
      });
    });

    it("应该渲染合同列表", async () => {
      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("data-count")).toHaveTextContent("2");
      });
    });

    it("应该调用 API 获取数据", async () => {
      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(contractApi.list).toHaveBeenCalled();
      });
    });
  });

  describe("筛选功能", () => {
    it("应该渲染所有筛选器", async () => {
      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("filter-search")).toBeInTheDocument();
        expect(screen.getByTestId("filter-type")).toBeInTheDocument();
        expect(screen.getByTestId("filter-status")).toBeInTheDocument();
      });
    });
  });

  describe("分页功能", () => {
    it("应该显示分页信息", async () => {
      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("total-count")).toHaveTextContent("2");
      });
    });
  });

  describe("行操作", () => {
    it("应该渲染行操作按钮（仅查看）", async () => {
      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("action-查看")).toBeInTheDocument();
      });
    });

    it("应该处理查看操作", async () => {
      const navigate = vi.fn();
      (vi.mocked("react-router-dom").useNavigate as any).mockReturnValue(navigate);

      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const viewButton = screen.getByTestId("action-查看");
        fireEvent.click(viewButton);
      });
    });
  });

  describe("空状态", () => {
    it("应该显示空状态消息", async () => {
      (contractApi.list as any).mockResolvedValue({
        code: 200,
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
        },
      });

      render(
        <BrowserRouter>
          <PmContractListPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-message")).toHaveTextContent("暂无合同数据");
      });
    });
  });
});
