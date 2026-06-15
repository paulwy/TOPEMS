/**
 * PageHeader 完整测试套件
 *
 * 测试页面头部组件的所有功能
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";

// Mock 组件
vi.mock("@/components/layout", () => ({
  PageHeader: vi.fn(({
    title,
    subtitle,
    showBack,
    onBack,
    actions,
    showSearch,
    onSearch,
  }) => (
    <div data-testid="page-header">
      {showBack && (
        <button data-testid="back-button" onClick={onBack}>
          返回
        </button>
      )}
      <h1 data-testid="title">{title}</h1>
      {subtitle && <span data-testid="subtitle">{subtitle}</span>}
      {actions && <div data-testid="actions">{actions}</div>}
      {showSearch && (
        <input
          data-testid="search-input"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      )}
    </div>
  )),
}));

import { PageHeader } from "@/components/layout";

describe("PageHeader 页面头部", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本渲染", () => {
    it("应该渲染页面标题", () => {
      render(
        <BrowserRouter>
          <PageHeader title="测试页面" />
        </BrowserRouter>
      );

      expect(screen.getByTestId("title")).toHaveTextContent("测试页面");
    });

    it("应该渲染副标题", () => {
      render(
        <BrowserRouter>
          <PageHeader title="测试页面" subtitle="副标题" />
        </BrowserRouter>
      );

      expect(screen.getByTestId("subtitle")).toHaveTextContent("副标题");
    });
  });

  describe("返回按钮", () => {
    it("应该显示返回按钮", () => {
      render(
        <BrowserRouter>
          <PageHeader title="测试页面" showBack onBack={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByTestId("back-button")).toBeInTheDocument();
    });

    it("点击返回按钮应该触发回调", async () => {
      const handleBack = vi.fn();
      render(
        <BrowserRouter>
          <PageHeader title="测试页面" showBack onBack={handleBack} />
        </BrowserRouter>
      );

      await userEvent.click(screen.getByTestId("back-button"));
      expect(handleBack).toHaveBeenCalled();
    });
  });

  describe("操作按钮", () => {
    it("应该渲染操作按钮", () => {
      render(
        <BrowserRouter>
          <PageHeader
            title="测试页面"
            actions={<button>新建</button>}
          />
        </BrowserRouter>
      );

      expect(screen.getByRole("button", { name: "新建" })).toBeInTheDocument();
    });
  });

  describe("搜索功能", () => {
    it("应该显示搜索框", () => {
      render(
        <BrowserRouter>
          <PageHeader title="测试页面" showSearch onSearch={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("搜索输入应该触发回调", async () => {
      const handleSearch = vi.fn();
      render(
        <BrowserRouter>
          <PageHeader title="测试页面" showSearch onSearch={handleSearch} />
        </BrowserRouter>
      );

      await userEvent.type(screen.getByTestId("search-input"), "测试");
      expect(handleSearch).toHaveBeenCalledWith("测试");
    });
  });
});
