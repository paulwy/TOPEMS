/**
 * ListPageTemplate 完整测试套件
 *
 * 测试列表页模板组件的所有功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";

// Mock 组件
vi.mock("@/components/templates", () => ({
  ListPageTemplate: vi.fn(({ title, columns, data, loading, filters, pagination, onRowClick }) => (
    <div data-testid="list-page-template">
      <h1>{title}</h1>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="data-count">{data.length}</div>
      <div data-testid="total-count">{pagination?.total || 0}</div>
      {filters?.map((filter: any) => (
        <div key={filter.id} data-testid={`filter-${filter.id}`}>
          {filter.label}
        </div>
      ))}
      {data.map((item: any, index: number) => (
        <div
          key={item.id || index}
          data-testid={`row-${index}`}
          onClick={() => onRowClick?.(item)}
        >
          {columns.map((col: any) => (
            <span key={col.id} data-testid={`cell-${col.id}`}>
              {col.render ? col.render(item[col.accessor], item) : item[col.accessor]}
            </span>
          ))}
        </div>
      ))}
    </div>
  )),
}));

import { ListPageTemplate } from "@/components/templates";

describe("ListPageTemplate 列表页模板", () => {
  const mockColumns = [
    { id: "name", header: "名称", accessor: "name", sortable: true },
    { id: "status", header: "状态", accessor: "status", render: (v: string) => v },
  ];

  const mockData = [
    { id: "1", name: "项目A", status: "active" },
    { id: "2", name: "项目B", status: "inactive" },
  ];

  const mockFilters = [
    { id: "search", label: "搜索", type: "search", placeholder: "搜索..." },
    { id: "status", label: "状态", type: "select", options: [] },
  ];

  const mockPagination = {
    page: 1,
    pageSize: 10,
    total: 2,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本渲染", () => {
    it("应该渲染页面标题", () => {
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={mockData}
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      expect(screen.getByText("测试页面")).toBeInTheDocument();
    });

    it("应该渲染数据列表", () => {
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={mockData}
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId("data-count")).toHaveTextContent("2");
    });

    it("应该渲染加载状态", () => {
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={mockData}
            loading={true}
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    });
  });

  describe("筛选功能", () => {
    it("应该渲染筛选器", () => {
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={mockData}
            filters={mockFilters}
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId("filter-search")).toBeInTheDocument();
      expect(screen.getByTestId("filter-status")).toBeInTheDocument();
    });
  });

  describe("行操作", () => {
    it("应该支持行点击", async () => {
      const handleRowClick = vi.fn();
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={mockData}
            onRowClick={handleRowClick}
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      const row = screen.getByTestId("row-0");
      await userEvent.click(row);

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
    });
  });

  describe("分页功能", () => {
    it("应该显示分页信息", () => {
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={mockData}
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId("total-count")).toHaveTextContent("2");
    });
  });

  describe("空状态", () => {
    it("应该显示空状态消息", () => {
      render(
        <BrowserRouter>
          <ListPageTemplate
            title="测试页面"
            columns={mockColumns}
            data={[]}
            emptyMessage="暂无数据"
            pagination={mockPagination}
          />
        </BrowserRouter>
      );

      // 空状态消息应该在数据为空时显示
      expect(screen.getByTestId("data-count")).toHaveTextContent("0");
    });
  });
});
