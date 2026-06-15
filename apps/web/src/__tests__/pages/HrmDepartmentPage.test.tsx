/**
 * HrmDepartmentPage 部门管理页面测试
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

vi.mock("@/api/hrm", () => ({
  departmentApi: {
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import { departmentApi } from "@/api/hrm";
import { useAppStore } from "@/store";
import { ListPageTemplate, PageHeader } from "@/components/templates";
import { FilterBar } from "@/components/mui";
import HrmDepartmentPage from "@/pages/HrmDepartmentPageRefactored";

describe("HrmDepartmentPage 部门管理页面", () => {
  const mockDepartments = [
    { id: "1", name: "技术部", code: "TECH", manager_name: "张三", parent_name: "总公司", employee_count: 20, status: "active" },
    { id: "2", name: "市场部", code: "MKT", manager_name: "李四", parent_name: "总公司", employee_count: 15, status: "inactive" },
  ];

  const mockApiResponse = {
    code: 200,
    data: {
      items: mockDepartments,
      total: 2,
      page: 1,
      page_size: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (departmentApi.list as any).mockResolvedValue(mockApiResponse);
  });

  describe("基本渲染", () => {
    it("应该渲染页面标题", async () => {
      render(
        <BrowserRouter>
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("page-header")).toBeInTheDocument();
      });
    });

    it("应该渲染加载状态", async () => {
      render(
        <BrowserRouter>
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });
    });

    it("应该调用 API 获取数据", async () => {
      render(
        <BrowserRouter>
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(departmentApi.list).toHaveBeenCalled();
      });
    });
  });

  describe("筛选功能", () => {
    it("应该渲染筛选器", async () => {
      render(
        <BrowserRouter>
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("filter-search")).toBeInTheDocument();
        expect(screen.getByTestId("filter-status")).toBeInTheDocument();
      });
    });

    it("应该处理筛选条件变化", async () => {
      const addNotification = vi.fn();
      (useAppStore as any).mockReturnValue({ addNotification });

      render(
        <BrowserRouter>
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(departmentApi.list).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            page_size: 10,
          })
        );
      });
    });
  });

  describe("分页功能", () => {
    it("应该显示分页信息", async () => {
      render(
        <BrowserRouter>
          <HrmDepartmentPage />
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
          <HrmDepartmentPage />
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
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const viewButton = screen.getByTestId("action-查看");
        fireEvent.click(viewButton);
      });

      // 查看操作会打开模态框
      await waitFor(() => {
        expect(screen.getByText("部门详情")).toBeInTheDocument();
      });
    });

    it("应该处理删除操作", async () => {
      window.confirm = vi.fn(() => true);
      (departmentApi.delete as any).mockResolvedValue({ code: 200 });

      render(
        <BrowserRouter>
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        const deleteButton = screen.getByTestId("action-删除");
        fireEvent.click(deleteButton);
      });

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe("空状态", () => {
    it("应该显示空状态消息", async () => {
      (departmentApi.list as any).mockResolvedValue({
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
          <HrmDepartmentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-message")).toHaveTextContent("暂无部门数据");
      });
    });
  });
});
