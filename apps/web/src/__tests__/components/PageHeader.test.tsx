import { CssBaseline } from "@mui/material";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import { Settings, Plus, Download, Upload, BarChart3 } from "lucide-react";
import { PageHeader, PageHeaderProps } from "../../components/templates/PageHeader";

const theme = createTheme();

const renderWithProviders = (ui: React.ReactElement, options?: any) => {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
    options
  );
};

describe("PageHeader 页面头部组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基础渲染测试", () => {
    it("应该正确渲染标题", () => {
      renderWithProviders(<PageHeader title="测试页面" />);
      expect(screen.getByText("测试页面")).toBeInTheDocument();
    });

    it("应该正确渲染副标题", () => {
      renderWithProviders(<PageHeader title="测试页面" subtitle="Test Subtitle" />);
      expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
    });

    it("应该正确渲染描述", () => {
      renderWithProviders(<PageHeader title="测试页面" description="这是一个描述" />);
      expect(screen.getByText("这是一个描述")).toBeInTheDocument();
    });

    it("应该正确渲染页面图标", () => {
      const { container } = renderWithProviders(<PageHeader title="测试页面" pageIcon={<Settings />} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("应该在加载状态显示骨架屏", () => {
      const { container } = renderWithProviders(<PageHeader title="测试页面" loading />);
      const skeleton = container.querySelector('[class*="MuiSkeleton-root"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("面包屑导航测试", () => {
    it("应该正确渲染面包屑", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          breadcrumbs={[
            { label: "首页", href: "/dashboard" },
            { label: "模块", href: "/module" },
            { label: "页面" },
          ]}
        />
      );
      expect(screen.getByText("首页")).toBeInTheDocument();
      expect(screen.getByText("模块")).toBeInTheDocument();
      expect(screen.getByText("页面")).toBeInTheDocument();
    });

    it("应该为带 href 的面包屑渲染链接", () => {
      const { container } = renderWithProviders(
        <PageHeader
          title="测试页面"
          breadcrumbs={[
            { label: "首页", href: "/dashboard" },
            { label: "模块", href: "/module" },
            { label: "页面" },
          ]}
        />
      );
      const links = container.querySelectorAll("a");
      expect(links.length).toBe(2);
      expect(links[0]).toHaveAttribute("href", "/dashboard");
      expect(links[1]).toHaveAttribute("href", "/module");
    });
  });

  describe("返回按钮测试", () => {
    it("应该渲染返回按钮", () => {
      renderWithProviders(
        <PageHeader title="测试页面" backButton={{ onClick: vi.fn() }} />
      );
      expect(screen.getByLabelText("返回")).toBeInTheDocument();
    });

    it("点击返回按钮应该触发 onClick", () => {
      const onClick = vi.fn();
      renderWithProviders(
        <PageHeader title="测试页面" backButton={{ onClick }} />
      );
      fireEvent.click(screen.getByLabelText("返回"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("应该支持返回按钮链接", () => {
      renderWithProviders(
        <PageHeader title="测试页面" backButton={{ href: "/dashboard" }} />
      );
      const link = screen.getByRole("link", { name: /返回/i });
      expect(link).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("操作按钮测试", () => {
    it("应该渲染操作按钮", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          actions={[{ label: "新建", icon: <Plus />, onClick: vi.fn() }]}
        />
      );
      expect(screen.getByText("新建")).toBeInTheDocument();
    });

    it("点击操作按钮应该触发 onClick", () => {
      const onClick = vi.fn();
      renderWithProviders(
        <PageHeader
          title="测试页面"
          actions={[{ label: "新建", icon: <Plus />, onClick }]}
        />
      );
      fireEvent.click(screen.getByText("新建"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("应该支持多种按钮变体", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          actions={[
            { label: "新建", variant: "contained", onClick: vi.fn() },
            { label: "导入", variant: "outlined", onClick: vi.fn() },
            { label: "导出", variant: "text", onClick: vi.fn() },
          ]}
        />
      );
      expect(screen.getByText("新建")).toBeInTheDocument();
      expect(screen.getByText("导入")).toBeInTheDocument();
      expect(screen.getByText("导出")).toBeInTheDocument();
    });

    it("应该支持多种按钮颜色", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          actions={[
            { label: "成功", color: "success", onClick: vi.fn() },
            { label: "警告", color: "warning", onClick: vi.fn() },
            { label: "错误", color: "error", onClick: vi.fn() },
          ]}
        />
      );
      expect(screen.getByText("成功")).toBeInTheDocument();
      expect(screen.getByText("警告")).toBeInTheDocument();
      expect(screen.getByText("错误")).toBeInTheDocument();
    });
  });

  describe("搜索框测试", () => {
    it("应该渲染搜索框", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          search={{ value: "", onChange: vi.fn() }}
        />
      );
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("搜索框应该显示占位符", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          search={{ value: "", onChange: vi.fn(), placeholder: "搜索内容..." }}
        />
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "搜索内容...");
    });

    it("搜索框值变化应该触发 onChange", () => {
      const onChange = vi.fn();
      renderWithProviders(
        <PageHeader
          title="测试页面"
          search={{ value: "", onChange }}
        />
      );
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "test" } });
      expect(onChange).toHaveBeenCalledWith("test");
    });
  });

  describe("标签页测试", () => {
    it("应该渲染标签页", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          tabs={[
            { label: "标签1", value: "tab1", active: true },
            { label: "标签2", value: "tab2" },
          ]}
          onTabChange={vi.fn()}
        />
      );
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(2);
      expect(tabs[0]).toHaveTextContent("标签1");
      expect(tabs[1]).toHaveTextContent("标签2");
    });

    it("切换标签页应该触发 onTabChange", () => {
      const onTabChange = vi.fn();
      renderWithProviders(
        <PageHeader
          title="测试页面"
          tabs={[
            { label: "标签1", value: "tab1", active: true },
            { label: "标签2", value: "tab2" },
          ]}
          onTabChange={onTabChange}
        />
      );
      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);
      expect(onTabChange).toHaveBeenCalledWith("tab2");
    });

    it("应该支持禁用标签页", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          tabs={[
            { label: "标签1", value: "tab1", active: true },
            { label: "标签2", value: "tab2", disabled: true },
          ]}
        />
      );
      const tabs = screen.getAllByRole("tab");
      expect(tabs[1]).toBeDisabled();
    });
  });

  describe("统计信息测试", () => {
    it("应该渲染统计信息", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          stats={[
            { label: "总数", value: 100 },
            { label: "完成", value: 50 },
          ]}
        />
      );
      expect(screen.getByText("总数: 100")).toBeInTheDocument();
      expect(screen.getByText("完成: 50")).toBeInTheDocument();
    });
  });

  describe("刷新按钮测试", () => {
    it("应该渲染刷新按钮", () => {
      renderWithProviders(<PageHeader title="测试页面" onRefresh={vi.fn()} />);
      expect(screen.getByLabelText("刷新")).toBeInTheDocument();
    });

    it("点击刷新按钮应该触发 onRefresh", () => {
      const onRefresh = vi.fn();
      renderWithProviders(<PageHeader title="测试页面" onRefresh={onRefresh} />);
      fireEvent.click(screen.getByLabelText("刷新"));
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("徽章测试", () => {
    it("应该渲染徽章", () => {
      renderWithProviders(
        <PageHeader title="测试页面" badge={{ label: "NEW" }} />
      );
      expect(screen.getByText("NEW")).toBeInTheDocument();
    });

    it("应该支持徽章颜色", () => {
      renderWithProviders(
        <PageHeader title="测试页面" badge={{ label: "NEW", color: "success" }} />
      );
      expect(screen.getByText("NEW")).toBeInTheDocument();
    });
  });

  describe("自定义工具栏测试", () => {
    it("应该渲染自定义工具栏", () => {
      renderWithProviders(
        <PageHeader
          title="测试页面"
          customToolbar={<div data-testid="custom-toolbar">自定义内容</div>}
        />
      );
      expect(screen.getByTestId("custom-toolbar")).toBeInTheDocument();
      expect(screen.getByText("自定义内容")).toBeInTheDocument();
    });
  });

  describe("紧凑模式测试", () => {
    it("应该支持紧凑模式", () => {
      renderWithProviders(<PageHeader title="测试页面" compact />);
      expect(screen.getByText("测试页面")).toBeInTheDocument();
    });
  });

  describe("分隔线测试", () => {
    it("应该支持隐藏分隔线", () => {
      renderWithProviders(<PageHeader title="测试页面" showDivider={false} />);
      expect(screen.getByText("测试页面")).toBeInTheDocument();
    });
  });

  describe("综合测试", () => {
    it("应该渲染完整的页面头部", () => {
      const onRefreshFn = vi.fn();
      const onTabChangeFn = vi.fn();
      const searchOnChange = vi.fn();

      renderWithProviders(
        <PageHeader
          title="质量管理系统"
          subtitle="Quality Management System"
          description="管理企业质量标准和检验流程"
          pageIcon={<Settings style={{ width: 20, height: 20 }} />}
          pageColor="linear-gradient(135deg, #6366F1, #8B5CF6)"
          breadcrumbs={[
            { label: "首页", href: "/dashboard" },
            { label: "QMS" },
            { label: "质量管理" },
          ]}
          backButton={{ onClick: vi.fn() }}
          actions={[
            { label: "导入", icon: <Upload />, variant: "outlined", onClick: vi.fn() },
            { label: "导出", icon: <Download />, variant: "outlined", onClick: vi.fn() },
            { label: "新建", icon: <Plus />, variant: "contained", onClick: vi.fn() },
          ]}
          tabs={[
            { label: "质量标准", value: "standards", active: true },
            { label: "质量检测", value: "checks" },
            { label: "质量异常", value: "issues" },
          ]}
          onTabChange={onTabChangeFn}
          search={{ value: "", onChange: searchOnChange, placeholder: "搜索..." }}
          stats={[{ label: "标准数", value: 50 }]}
          onRefresh={onRefreshFn}
          badge={{ label: "NEW", color: "error" }}
        />
      );

      expect(screen.getByText("质量管理系统")).toBeInTheDocument();
      expect(screen.getByText("Quality Management System")).toBeInTheDocument();
      expect(screen.getByText("管理企业质量标准和检验流程")).toBeInTheDocument();
      expect(screen.getByText("首页")).toBeInTheDocument();
      expect(screen.getByText("导入")).toBeInTheDocument();
      expect(screen.getByText("导出")).toBeInTheDocument();
      expect(screen.getByText("新建")).toBeInTheDocument();
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(3);
      expect(tabs[0]).toHaveTextContent("质量标准");
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText("标准数: 50")).toBeInTheDocument();
      expect(screen.getByLabelText("刷新")).toBeInTheDocument();
      expect(screen.getByText("NEW")).toBeInTheDocument();
    });
  });
});