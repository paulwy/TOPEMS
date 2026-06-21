/**
 * StatsPageTemplate 单元测试
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import type { StatCard } from "../StatsPageTemplate";
import { StatsPageTemplate } from "../StatsPageTemplate";

// Mock MUI components
vi.mock("@mui/material", () => ({
  Box: ({ children, ...props }: any) => (
    <div data-testid="box" {...props}>
      {children}
    </div>
  ),
  Paper: ({ children, ...props }: any) => (
    <div data-testid="paper" {...props}>
      {children}
    </div>
  ),
  Typography: ({ children, ...props }: any) => (
    <div data-testid="typography" {...props}>
      {children}
    </div>
  ),
  TextField: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      data-testid="textfield"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="iconbutton" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Select: ({ value, onChange, children, ...props }: any) => (
    <select data-testid="select" value={value} onChange={onChange} {...props}>
      {children}
    </select>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option data-testid="menuitem" value={value} {...props}>
      {children}
    </option>
  ),
  FormControl: ({ children, ...props }: any) => (
    <div data-testid="formcontrol" {...props}>
      {children}
    </div>
  ),
  InputLabel: ({ children, ...props }: any) => (
    <label data-testid="inputlabel" {...props}>
      {children}
    </label>
  ),
  Chip: ({ label, ...props }: any) => <span data-testid="chip">{label}</span>,
  Tabs: ({ value, onChange, children }: any) => (
    <div data-testid="tabs" onClick={() => onChange({}, "tab2")}>
      {children}
    </div>
  ),
  Tab: ({ label, value }: any) => (
    <div data-testid="tab" data-value={value}>
      {label}
    </div>
  ),
  Skeleton: ({ ...props }: any) => <div data-testid="skeleton" {...props} />,
  Tooltip: ({ children, ...props }: any) => (
    <div data-testid="tooltip" {...props}>
      {children}
    </div>
  ),
  InputAdornment: ({ children }: any) => <div>{children}</div>,
  Divider: (props: any) => <div data-testid="divider" {...props} />,
  useTheme: () => ({ breakpoints: { down: () => false } }),
  useMediaQuery: () => false,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Search: () => <span data-testid="icon-search">Search</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
  Filter: () => <span data-testid="icon-filter">Filter</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
}));

// Mock EmptyState
jest.mock("./EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

describe("StatsPageTemplate", () => {
  const mockStatCards: StatCard[] = [
    {
      id: "total",
      title: "总用户数",
      value: 1000,
      icon: <span>Icon</span>,
      color: "primary" as const,
    },
    {
      id: "active",
      title: "活跃用户",
      value: 800,
      icon: <span>Icon</span>,
      color: "success" as const,
    },
    {
      id: "new",
      title: "新增用户",
      value: 150,
      icon: <span>Icon</span>,
      color: "info" as const,
    },
    {
      id: "inactive",
      title: "沉默用户",
      value: 50,
      icon: <span>Icon</span>,
      color: "warning" as const,
    },
  ];

  const mockCharts = [
    {
      id: "chart1",
      title: "用户增长趋势",
      type: "line" as const,
      dataKey: "value",
      nameKey: "name",
      data: [
        { name: "1月", value: 100 },
        { name: "2月", value: 150 },
        { name: "3月", value: 200 },
      ],
      height: 300,
    },
    {
      id: "chart2",
      title: "用户分布",
      type: "pie" as const,
      dataKey: "value",
      nameKey: "name",
      data: [
        { name: "活跃", value: 60 },
        { name: "沉默", value: 30 },
        { name: "流失", value: 10 },
      ],
      height: 300,
    },
  ];

  const mockTables = [
    {
      id: "table1",
      title: "用户详情",
      columns: [
        { id: "name", label: "用户名", field: "name" },
        { id: "email", label: "邮箱", field: "email" },
        { id: "status", label: "状态", field: "status" },
      ],
      data: [
        {
          id: "1",
          name: "张三",
          email: "zhangsan@example.com",
          status: "活跃",
        },
        { id: "2", name: "李四", email: "lisi@example.com", status: "沉默" },
      ],
    },
  ];

  const defaultProps = {
    title: "数据统计",
    statCards: mockStatCards,
    charts: mockCharts,
    tables: mockTables,
    onRefresh: jest.fn(),
    onExport: jest.fn(),
    onSearch: jest.fn(),
    onTimeRangeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("基本渲染", () => {
    it("应该正确渲染页面标题", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByText("数据统计")).toBeInTheDocument();
    });

    it("应该正确渲染副标题", () => {
      render(<StatsPageTemplate {...defaultProps} subtitle="用户数据分析" />);
      expect(screen.getByText("用户数据分析")).toBeInTheDocument();
    });

    it("应该渲染刷新按钮", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByTestId("icon-refresh")).toBeInTheDocument();
    });

    it("应该渲染导出按钮", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByTestId("icon-download")).toBeInTheDocument();
      expect(screen.getByText("导出")).toBeInTheDocument();
    });
  });

  describe("统计卡片", () => {
    it("应该正确渲染统计卡片", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByText("总用户数")).toBeInTheDocument();
      expect(screen.getByText("1000")).toBeInTheDocument();
      expect(screen.getByText("活跃用户")).toBeInTheDocument();
      expect(screen.getByText("800")).toBeInTheDocument();
    });

    it("应该渲染趋势指示器", () => {
      const statsWithTrend = mockStatCards.map((stat, index) => ({
        ...stat,
        trend: {
          value: index * 5,
          direction: "up" as const,
          label: `+${index * 5}%`,
        },
      }));
      render(
        <StatsPageTemplate {...defaultProps} statCards={statsWithTrend} />,
      );
      expect(screen.getByText("+0%")).toBeInTheDocument();
      expect(screen.getByText("+5%")).toBeInTheDocument();
    });
  });

  describe("图表", () => {
    it("应该正确渲染图表区域", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
      expect(screen.getByText("用户分布")).toBeInTheDocument();
    });

    it("应该显示图表类型信息", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByText("图表: line - 3 项数据")).toBeInTheDocument();
      expect(screen.getByText("图表: pie - 3 项数据")).toBeInTheDocument();
    });
  });

  describe("数据表格", () => {
    it("应该正确渲染数据表格", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByText("用户详情")).toBeInTheDocument();
      expect(screen.getByText("用户名")).toBeInTheDocument();
      expect(screen.getByText("邮箱")).toBeInTheDocument();
      expect(screen.getByText("状态")).toBeInTheDocument();
    });

    it("应该渲染表格数据", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      expect(screen.getByText("张三")).toBeInTheDocument();
      expect(screen.getByText("zhangsan@example.com")).toBeInTheDocument();
      expect(screen.getByText("活跃")).toBeInTheDocument();
    });
  });

  describe("标签页", () => {
    it("应该渲染标签页", () => {
      const tabs = [
        { label: "概览", value: "overview" },
        { label: "明细", value: "detail" },
        { label: "趋势", value: "trend" },
      ];
      render(<StatsPageTemplate {...defaultProps} tabs={tabs} />);
      expect(screen.getByText("概览")).toBeInTheDocument();
      expect(screen.getByText("明细")).toBeInTheDocument();
      expect(screen.getByText("趋势")).toBeInTheDocument();
    });

    it("点击标签应该触发onTabChange回调", () => {
      const onTabChange = jest.fn();
      const tabs = [
        { label: "概览", value: "overview" },
        { label: "明细", value: "detail" },
      ];
      render(
        <StatsPageTemplate
          {...defaultProps}
          tabs={tabs}
          onTabChange={onTabChange}
        />,
      );
      fireEvent.click(screen.getByText("明细"));
      expect(onTabChange).toHaveBeenCalled();
    });
  });

  describe("时间范围选择", () => {
    it("应该渲染时间范围选择器", () => {
      const timeRangeOptions = [
        { label: "今天", value: "today" },
        { label: "本周", value: "week" },
        { label: "本月", value: "month" },
      ];
      render(
        <StatsPageTemplate
          {...defaultProps}
          timeRangeOptions={timeRangeOptions}
          timeRange="week"
        />,
      );
      expect(screen.getByTestId("select")).toBeInTheDocument();
    });
  });

  describe("搜索功能", () => {
    it("应该渲染搜索框", () => {
      render(
        <StatsPageTemplate
          {...defaultProps}
          search={{ value: "", onChange: jest.fn(), placeholder: "搜索..." }}
        />,
      );
      expect(screen.getByPlaceholderText("搜索...")).toBeInTheDocument();
    });
  });

  describe("空状态", () => {
    it("当数据为空时应该显示空状态", () => {
      render(
        <StatsPageTemplate
          {...defaultProps}
          statCards={[]}
          charts={[]}
          tables={[]}
        />,
      );
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  describe("加载状态", () => {
    it("加载中应该显示骨架屏", () => {
      render(<StatsPageTemplate {...defaultProps} loading={true} />);
      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });
  });

  describe("刷新和导出", () => {
    it("点击刷新按钮应该触发onRefresh回调", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      fireEvent.click(screen.getByTestId("icon-refresh"));
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it("点击导出按钮应该触发onExport回调", () => {
      render(<StatsPageTemplate {...defaultProps} />);
      fireEvent.click(screen.getByText("导出"));
      expect(defaultProps.onExport).toHaveBeenCalled();
    });
  });
});
