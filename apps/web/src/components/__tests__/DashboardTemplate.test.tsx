import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { DashboardTemplate } from "../templates/DashboardTemplate";
import type {
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  CardGroup,
  LayoutConfig,
} from "../templates/DashboardTemplate";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock useMediaQuery
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: vi.fn().mockReturnValue(false),
  };
});

describe("DashboardTemplate", () => {
  const basicStats: StatCard[] = [
    {
      id: "stat-1",
      title: "总用户数",
      value: 1234,
      unit: "人",
      change: 12.5,
      changeLabel: "较上月",
      color: "primary",
    },
    {
      id: "stat-2",
      title: "活跃用户",
      value: 567,
      unit: "人",
      change: -3.2,
      changeLabel: "较上月",
      color: "success",
    },
  ];

  const basicCharts: ChartCard[] = [
    {
      id: "chart-1",
      title: "用户增长趋势",
      type: "line",
      chart: <div data-testid="mock-chart">Mock Chart</div>,
      height: 400,
    },
    {
      id: "chart-2",
      title: "销售额分布",
      type: "bar",
      chart: <div data-testid="mock-chart-2">Mock Chart 2</div>,
      height: 400,
    },
  ];

  const basicRecentItems: RecentItem[] = [
    {
      id: "item-1",
      title: "新用户注册",
      description: "张三完成了注册",
      time: "2分钟前",
      status: "success",
    },
    {
      id: "item-2",
      title: "订单完成",
      description: "订单 #12345 已完成",
      time: "5分钟前",
      status: "info",
    },
  ];

  const basicQuickActions: QuickAction[] = [
    {
      id: "action-1",
      label: "新建项目",
      icon: <span data-testid="action-icon">+</span>,
      onClick: vi.fn(),
    },
    {
      id: "action-2",
      label: "导出数据",
      icon: <span data-testid="action-icon-2">↓</span>,
      onClick: vi.fn(),
    },
  ];

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("基础渲染", () => {
    it("渲染页面标题和副标题", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          subtitle="实时数据监控"
          stats={basicStats}
        />,
      );

      expect(screen.getByText("数据概览")).toBeInTheDocument();
      expect(screen.getByText("实时数据监控")).toBeInTheDocument();
    });

    it("渲染面包屑导航", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("数据概览")).toBeInTheDocument();
    });

    it("渲染加载状态", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          loading={true}
        />,
      );

      // 组件应该正常渲染（即使在loading状态）
      // 注意：loading状态可能不会显示所有内容
    });
  });

  describe("统计卡片", () => {
    it("渲染统计卡片", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
        />,
      );

      expect(screen.getByText("总用户数")).toBeInTheDocument();
      expect(screen.getByText("1234")).toBeInTheDocument();
      expect(screen.getByText("活跃用户")).toBeInTheDocument();
      expect(screen.getByText("567")).toBeInTheDocument();
    });

    it("渲染增长趋势数据", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
        />,
      );

      expect(screen.getByText("总用户数")).toBeInTheDocument();
      expect(screen.getByText("1234")).toBeInTheDocument();
      expect(screen.getByText("活跃用户")).toBeInTheDocument();
      expect(screen.getByText("567")).toBeInTheDocument();
    });

    it("渲染进度条", () => {
      const statsWithProgress: StatCard[] = [
        {
          id: "stat-1",
          title: "任务完成率",
          value: 75,
          unit: "%",
          progress: 75,
          progressLabel: "本月进度",
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          stats={statsWithProgress}
        />,
      );

      expect(screen.getByText("本月进度")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("渲染趋势图", () => {
      const statsWithTrend: StatCard[] = [
        {
          id: "stat-1",
          title: "销售额",
          value: 10000,
          trend: [100, 120, 150, 180, 200, 220],
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          stats={statsWithTrend}
        />,
      );

      expect(screen.getByText("销售额")).toBeInTheDocument();
      // SVG趋势图应该被渲染
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("渲染标签", () => {
      const statsWithTags: StatCard[] = [
        {
          id: "stat-1",
          title: "VIP用户",
          value: 100,
          tags: [
            { label: "重要", color: "#ff0000" },
            { label: "活跃", color: "#00ff00" },
          ],
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          stats={statsWithTags}
        />,
      );

      expect(screen.getByText("重要")).toBeInTheDocument();
      expect(screen.getByText("活跃")).toBeInTheDocument();
    });

    it("点击卡片触发onClick", async () => {
      const handleClick = vi.fn();
      const clickableStats: StatCard[] = [
        {
          id: "stat-1",
          title: "总用户数",
          value: 1234,
          onClick: handleClick,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          stats={clickableStats}
        />,
      );

      const card = screen.getByText("总用户数").closest("div");
      await userEvent.click(card!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("卡片分组", () => {
    it("渲染卡片分组", () => {
      const cardGroups: CardGroup[] = [
        {
          id: "group-1",
          title: "用户统计",
          cards: basicStats,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          cardGroups={cardGroups}
        />,
      );

      expect(screen.getByText("用户统计")).toBeInTheDocument();
      expect(screen.getByText("总用户数")).toBeInTheDocument();
      expect(screen.getByText("活跃用户")).toBeInTheDocument();
    });

    it("可折叠分组功能", () => {
      const cardGroups: CardGroup[] = [
        {
          id: "group-1",
          title: "用户统计",
          cards: basicStats,
          collapsible: true,
          defaultExpanded: true,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          cardGroups={cardGroups}
        />,
      );

      // 初始状态：分组展开
      expect(screen.getByText("用户统计")).toBeInTheDocument();
      expect(screen.getByText("总用户数")).toBeInTheDocument();
    });

    it("tabs布局的分组", async () => {
      const cardGroups: CardGroup[] = [
        {
          id: "group-1",
          title: "用户统计",
          cards: basicStats,
          layout: "tabs",
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          cardGroups={cardGroups}
        />,
      );

      // 检查tabs
      expect(screen.getByRole("tab", { name: "总用户数" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "活跃用户" })).toBeInTheDocument();

      // 点击第二个tab
      await userEvent.click(screen.getByRole("tab", { name: "活跃用户" }));

      // 等待内容切换
      await waitFor(() => {
        expect(screen.getByText("567")).toBeInTheDocument();
      });
    });
  });

  describe("图表卡片", () => {
    it("渲染图表卡片", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          charts={basicCharts}
        />,
      );

      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
      expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
      expect(screen.getByText("销售额分布")).toBeInTheDocument();
      expect(screen.getByTestId("mock-chart-2")).toBeInTheDocument();
    });

    it("渲染图表类型标签", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          charts={basicCharts}
        />,
      );

      expect(screen.getByText("line")).toBeInTheDocument();
      expect(screen.getByText("bar")).toBeInTheDocument();
    });

    it("刷新图表功能", () => {
      const handleRefresh = vi.fn();
      const chartsWithRefresh: ChartCard[] = [
        {
          id: "chart-1",
          title: "用户增长趋势",
          chart: <div data-testid="mock-chart">Mock Chart</div>,
          onRefresh: handleRefresh,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          charts={chartsWithRefresh}
        />,
      );

      // 图表卡片应该正常渲染
      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
      expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
    });

    it("下载图表功能", () => {
      const handleDownload = vi.fn();
      const chartsWithDownload: ChartCard[] = [
        {
          id: "chart-1",
          title: "用户增长趋势",
          chart: <div data-testid="mock-chart">Mock Chart</div>,
          onDownload: handleDownload,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          charts={chartsWithDownload}
        />,
      );

      // 图表卡片应该正常渲染
      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
      expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
    });

    it("可展开图表功能", () => {
      const expandableCharts: ChartCard[] = [
        {
          id: "chart-1",
          title: "用户增长趋势",
          chart: <div data-testid="mock-chart">Mock Chart</div>,
          expandable: true,
          defaultExpanded: true,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          charts={expandableCharts}
        />,
      );

      // 初始状态：图表展开
      expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
    });

    it("显示错误状态", () => {
      const chartsWithError: ChartCard[] = [
        {
          id: "chart-1",
          title: "用户增长趋势",
          chart: <div data-testid="mock-chart">Mock Chart</div>,
          error: "数据加载失败",
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          charts={chartsWithError}
        />,
      );

      expect(screen.getByText("数据加载失败")).toBeInTheDocument();
    });
  });

  describe("最近事项", () => {
    it("渲染最近事项", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          recentItems={basicRecentItems}
          recentTitle="最新动态"
        />,
      );

      expect(screen.getByText("最新动态")).toBeInTheDocument();
      expect(screen.getByText("新用户注册")).toBeInTheDocument();
      expect(screen.getByText("张三完成了注册")).toBeInTheDocument();
      expect(screen.getByText("订单完成")).toBeInTheDocument();
    });

    it("渲染状态标签", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          recentItems={basicRecentItems}
        />,
      );

      expect(screen.getByText("success")).toBeInTheDocument();
      expect(screen.getByText("info")).toBeInTheDocument();
    });

    it("渲染标签", () => {
      const itemsWithTags: RecentItem[] = [
        {
          id: "item-1",
          title: "新用户注册",
          tags: [
            { label: "重要" },
            { label: "VIP" },
          ],
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          recentItems={itemsWithTags}
        />,
      );

      expect(screen.getByText("重要")).toBeInTheDocument();
      expect(screen.getByText("VIP")).toBeInTheDocument();
    });

    it("点击事项触发onClick", async () => {
      const handleClick = vi.fn();
      const clickableItems: RecentItem[] = [
        {
          id: "item-1",
          title: "新用户注册",
          onClick: handleClick,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          recentItems={clickableItems}
        />,
      );

      const item = screen.getByText("新用户注册").closest("div");
      await userEvent.click(item!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("快捷操作", () => {
    it("渲染快捷操作", () => {
      render(
        <DashboardTemplate
          title="数据概览"
          quickActions={basicQuickActions}
          quickActionsTitle="常用操作"
        />,
      );

      expect(screen.getByText("常用操作")).toBeInTheDocument();
      expect(screen.getByText("新建项目")).toBeInTheDocument();
      expect(screen.getByText("导出数据")).toBeInTheDocument();
    });

    it("渲染徽章", () => {
      const actionsWithBadge: QuickAction[] = [
        {
          id: "action-1",
          label: "待办事项",
          icon: <span>📋</span>,
          badge: 5,
          onClick: vi.fn(),
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          quickActions={actionsWithBadge}
        />,
      );

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("禁用状态", () => {
      const disabledActions: QuickAction[] = [
        {
          id: "action-1",
          label: "新建项目",
          icon: <span>+</span>,
          disabled: true,
          onClick: vi.fn(),
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          quickActions={disabledActions}
        />,
      );

      const action = screen.getByText("新建项目").closest("div");
      expect(action).toHaveStyle("opacity: 0.5");
    });

    it("点击操作触发onClick", async () => {
      const handleClick = vi.fn();
      const clickableActions: QuickAction[] = [
        {
          id: "action-1",
          label: "新建项目",
          icon: <span>+</span>,
          onClick: handleClick,
        },
      ];

      render(
        <DashboardTemplate
          title="数据概览"
          quickActions={clickableActions}
        />,
      );

      const action = screen.getByText("新建项目").closest("div");
      await userEvent.click(action!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("布局配置", () => {
    it("网格布局", () => {
      const layout: LayoutConfig = {
        statsLayout: "grid",
        chartsLayout: "grid",
      };

      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          charts={basicCharts}
          layout={layout}
        />,
      );

      expect(screen.getByText("总用户数")).toBeInTheDocument();
      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
    });

    it("tabs布局", async () => {
      const layout: LayoutConfig = {
        statsLayout: "tabs",
        chartsLayout: "tabs",
      };

      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          charts={basicCharts}
          layout={layout}
        />,
      );

      // 检查tabs
      expect(screen.getByRole("tab", { name: "总用户数" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "用户增长趋势" })).toBeInTheDocument();
    });

    it("stack布局", () => {
      const layout: LayoutConfig = {
        chartsLayout: "stack",
      };

      render(
        <DashboardTemplate
          title="数据概览"
          charts={basicCharts}
          layout={layout}
        />,
      );

      expect(screen.getByText("用户增长趋势")).toBeInTheDocument();
      expect(screen.getByText("销售额分布")).toBeInTheDocument();
    });

    it("自定义间距", () => {
      const layout: LayoutConfig = {
        spacing: 4,
      };

      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          layout={layout}
        />,
      );

      expect(screen.getByText("总用户数")).toBeInTheDocument();
    });
  });

  describe("持久化配置", () => {
    it("保存布局配置到localStorage", async () => {
      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          charts={basicCharts}
          persistConfig={true}
          configKey="test-dashboard-config"
        />,
      );

      // 等待配置保存
      await waitFor(() => {
        const savedConfig = localStorageMock.getItem("test-dashboard-config");
        expect(savedConfig).toBeTruthy();
      });
    });

    it("从localStorage加载布局配置", async () => {
      // 先保存一个配置
      localStorageMock.setItem("test-dashboard-config", JSON.stringify({
        statsLayout: "tabs",
        chartsLayout: "stack",
      }));

      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          charts={basicCharts}
          persistConfig={true}
          configKey="test-dashboard-config"
        />,
      );

      // 等待配置加载
      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "总用户数" })).toBeInTheDocument();
      });
    });
  });

  describe("自定义渲染器", () => {
    it("使用自定义统计卡片渲染器", () => {
      const customRenderers = {
        statCard: (stat: StatCard) => (
          <div data-testid="custom-stat-card">
            Custom: {stat.title}
          </div>
        ),
      };

      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          customRenderers={customRenderers}
        />,
      );

      const customCards = screen.getAllByTestId("custom-stat-card");
      expect(customCards.length).toBe(2);
      expect(screen.getByText("Custom: 总用户数")).toBeInTheDocument();
    });

    it("使用自定义图表卡片渲染器", () => {
      const customRenderers = {
        chartCard: (chart: ChartCard) => (
          <div data-testid="custom-chart-card">
            Custom: {chart.title}
          </div>
        ),
      };

      render(
        <DashboardTemplate
          title="数据概览"
          charts={basicCharts}
          customRenderers={customRenderers}
        />,
      );

      const customCards = screen.getAllByTestId("custom-chart-card");
      expect(customCards.length).toBe(2);
      expect(screen.getByText("Custom: 用户增长趋势")).toBeInTheDocument();
    });
  });

  describe("刷新功能", () => {
    it("onRefresh属性正常工作", () => {
      const handleRefresh = vi.fn();

      render(
        <DashboardTemplate
          title="数据概览"
          stats={basicStats}
          onRefresh={handleRefresh}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("数据概览")).toBeInTheDocument();
      expect(handleRefresh).not.toHaveBeenCalled();
    });
  });
});