/**
 * CardListTemplate 单元测试
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { CardListTemplate } from "../CardListTemplate";

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
  Collapse: ({ children, in: inProp }: any) =>
    inProp ? <div>{children}</div> : null,
  Pagination: ({ count, page, onChange }: any) => (
    <div
      data-testid="pagination"
      data-page={page}
      data-count={count}
      onClick={() => onChange({}, 2)}
    >
      Pagination
    </div>
  ),
  Skeleton: ({ ...props }: any) => <div data-testid="skeleton" {...props} />,
  Tooltip: ({ children, ...props }: any) => (
    <div data-testid="tooltip" {...props}>
      {children}
    </div>
  ),
  useTheme: () => ({ breakpoints: { down: () => false } }),
  useMediaQuery: () => false,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Search: () => <span data-testid="icon-search">Search</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
  Filter: () => <span data-testid="icon-filter">Filter</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  Grid: () => <span data-testid="icon-grid">Grid</span>,
  List: () => <span data-testid="icon-list">List</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">ChevronDown</span>,
  ChevronUp: () => <span data-testid="icon-chevron-up">ChevronUp</span>,
}));

// Mock EmptyState
jest.mock("./EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

describe("CardListTemplate", () => {
  const mockCardData = [
    {
      id: "1",
      title: "任务一",
      description: "这是一个重要任务",
      status: "pending",
      priority: "high",
      assignee: "张三",
      dueDate: "2024-01-15",
    },
    {
      id: "2",
      title: "任务二",
      description: "这是一个普通任务",
      status: "completed",
      priority: "low",
      assignee: "李四",
      dueDate: "2024-01-20",
    },
  ];

  const mockStats = [
    {
      id: "total",
      title: "任务总数",
      value: 100,
      icon: <span>Icon</span>,
      color: "primary" as const,
    },
    {
      id: "pending",
      title: "待处理",
      value: 50,
      icon: <span>Icon</span>,
      color: "warning" as const,
    },
    {
      id: "completed",
      title: "已完成",
      value: 45,
      icon: <span>Icon</span>,
      color: "success" as const,
    },
    {
      id: "overdue",
      title: "已逾期",
      value: 5,
      icon: <span>Icon</span>,
      color: "error" as const,
    },
  ];

  const cardConfig = {
    title: "title" as const,
    description: "description" as const,
    status: {
      field: "status" as const,
      options: {
        pending: { label: "待处理", color: "warning" },
        completed: { label: "已完成", color: "success" },
      },
    },
    meta: [
      { field: "assignee", label: "负责人", icon: <span>User</span> },
      { field: "dueDate", label: "截止日期", icon: <span>Date</span> },
    ],
  };

  const defaultProps = {
    title: "任务列表",
    data: mockCardData,
    cardConfig,
    onAdd: jest.fn(),
    onRefresh: jest.fn(),
    onCardClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("基本渲染", () => {
    it("应该正确渲染页面标题", () => {
      render(<CardListTemplate {...defaultProps} />);
      expect(screen.getByText("任务列表")).toBeInTheDocument();
    });

    it("应该正确渲染副标题", () => {
      render(<CardListTemplate {...defaultProps} subtitle="管理所有任务" />);
      expect(screen.getByText("管理所有任务")).toBeInTheDocument();
    });

    it("应该渲染新增按钮", () => {
      render(<CardListTemplate {...defaultProps} />);
      expect(screen.getByText("新增")).toBeInTheDocument();
    });
  });

  describe("统计卡片", () => {
    it("应该正确渲染统计概览", () => {
      render(<CardListTemplate {...defaultProps} metricStats={mockStats} />);
      expect(screen.getByText("任务总数")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("待处理")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("统计概览应该可折叠", () => {
      render(<CardListTemplate {...defaultProps} metricStats={mockStats} />);
      const toggleButton = screen.getByText("数据概览");
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe("卡片列表", () => {
    it("应该正确渲染卡片", () => {
      render(<CardListTemplate {...defaultProps} />);
      expect(screen.getByText("任务一")).toBeInTheDocument();
      expect(screen.getByText("这是一个重要任务")).toBeInTheDocument();
      expect(screen.getByText("任务二")).toBeInTheDocument();
    });

    it("应该正确渲染状态标签", () => {
      render(<CardListTemplate {...defaultProps} />);
      expect(screen.getByText("待处理")).toBeInTheDocument();
      expect(screen.getByText("已完成")).toBeInTheDocument();
    });

    it("点击卡片应该触发onCardClick回调", () => {
      render(<CardListTemplate {...defaultProps} />);
      const card = screen.getByText("任务一");
      fireEvent.click(card);
      expect(defaultProps.onCardClick).toHaveBeenCalled();
    });
  });

  describe("卡片操作", () => {
    it("应该渲染卡片操作按钮", () => {
      const cardActions = [
        { label: "编辑", onClick: jest.fn() },
        { label: "删除", onClick: jest.fn(), color: "error" as const },
      ];
      render(<CardListTemplate {...defaultProps} cardActions={cardActions} />);
      expect(screen.getByText("编辑")).toBeInTheDocument();
      expect(screen.getByText("删除")).toBeInTheDocument();
    });

    it("点击操作按钮应该触发对应回调", () => {
      const editHandler = jest.fn();
      const cardActions = [{ label: "编辑", onClick: editHandler }];
      render(<CardListTemplate {...defaultProps} cardActions={cardActions} />);
      fireEvent.click(screen.getByText("编辑"));
      expect(editHandler).toHaveBeenCalled();
    });
  });

  describe("筛选功能", () => {
    it("应该渲染筛选输入框", () => {
      render(
        <CardListTemplate
          {...defaultProps}
          search={{
            value: "",
            onChange: jest.fn(),
            placeholder: "搜索任务...",
          }}
        />,
      );
      expect(screen.getByPlaceholderText("搜索任务...")).toBeInTheDocument();
    });
  });

  describe("分页", () => {
    it("应该渲染分页组件", () => {
      render(
        <CardListTemplate
          {...defaultProps}
          pagination={{
            page: 1,
            pageSize: 10,
            total: 100,
            onPageChange: jest.fn(),
          }}
        />,
      );
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("当数据为空时不应渲染分页", () => {
      render(<CardListTemplate {...defaultProps} data={[]} />);
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });
  });

  describe("空状态", () => {
    it("当数据为空时应该显示空状态", () => {
      render(<CardListTemplate {...defaultProps} data={[]} />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText("暂无数据")).toBeInTheDocument();
    });
  });

  describe("加载状态", () => {
    it("加载中应该显示骨架屏", () => {
      render(<CardListTemplate {...defaultProps} loading={true} />);
      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });
  });

  describe("视图切换", () => {
    it("应该渲染视图切换按钮", () => {
      render(<CardListTemplate {...defaultProps} showViewToggle={true} />);
      expect(screen.getByTestId("icon-grid")).toBeInTheDocument();
      expect(screen.getByTestId("icon-list")).toBeInTheDocument();
    });

    it("点击网格视图按钮应该切换到网格视图", () => {
      const onViewModeChange = jest.fn();
      render(
        <CardListTemplate
          {...defaultProps}
          showViewToggle={true}
          onViewModeChange={onViewModeChange}
        />,
      );
      fireEvent.click(screen.getByTestId("icon-grid"));
      expect(onViewModeChange).toHaveBeenCalledWith("grid");
    });
  });
});
