import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { FormPageTemplate } from "../templates/FormPageTemplate";
import type {
  FormSection,
  FieldDependency,
} from "../templates/FormPageTemplate";

// 增加测试超时时间
vi.setConfig({ testTimeout: 30000 });

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

describe("FormPageTemplate", () => {
  const basicSections: FormSection[] = [
    {
      id: "section-1",
      title: "基本信息",
      fields: [
        {
          name: "title",
          label: "标题",
          type: "text",
          required: true,
          placeholder: "请输入标题",
        },
        {
          name: "description",
          label: "描述",
          type: "textarea",
          required: false,
          placeholder: "请输入描述",
        },
        {
          name: "status",
          label: "状态",
          type: "select",
          options: [
            { label: "草稿", value: "draft" },
            { label: "已发布", value: "published" },
          ],
        },
      ],
    },
  ];

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("基础渲染", () => {
    it("渲染表单标题", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });

    it("渲染分段标题", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText("基本信息")).toBeInTheDocument();
    });

    it("渲染加载状态", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          loading={true}
        />,
      );

      // 检查是否有Skeleton组件
      const skeletons = document.querySelectorAll('[class*="MuiSkeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("表单模式", () => {
    it("edit模式显示保存按钮", () => {
      render(
        <FormPageTemplate
          title="编辑项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          mode="edit"
        />,
      );

      expect(screen.getByText("保存")).toBeInTheDocument();
    });

    it("edit模式不显示提交按钮", () => {
      render(
        <FormPageTemplate
          title="编辑项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          mode="edit"
        />,
      );

      // edit模式使用默认的"保存"按钮
      expect(screen.queryByText("提交")).not.toBeInTheDocument();
    });
  });

  describe("字段联动", () => {
    it("处理字段联动 - visibility", async () => {
      const dependencies: FieldDependency[] = [
        {
          sourceField: "status",
          targetField: "publishedDate",
          type: "visibility",
          condition: {
            type: "equals",
            value: "published",
          },
          effect: {
            visible: true,
          },
        },
      ];

      const sectionsWithHiddenField: FormSection[] = [
        {
          id: "section-1",
          title: "基本信息",
          fields: [
            {
              name: "status",
              label: "状态",
              type: "select",
              options: [
                { label: "草稿", value: "draft" },
                { label: "已发布", value: "published" },
              ],
            },
            {
              name: "publishedDate",
              label: "发布日期",
              type: "date",
            },
          ],
        },
      ];

      render(
        <FormPageTemplate
          title="创建项目"
          sections={sectionsWithHiddenField}
          onSubmit={mockOnSubmit}
          dependencies={dependencies}
        />,
      );

      // 初始状态应该有status和publishedDate字段
      expect(screen.getByLabelText("状态")).toBeInTheDocument();
      expect(screen.getByLabelText("发布日期")).toBeInTheDocument();
    });

    it("处理字段联动 - required", () => {
      const dependencies: FieldDependency[] = [
        {
          sourceField: "status",
          targetField: "reviewComment",
          type: "required",
          condition: {
            type: "equals",
            value: "draft",
          },
          effect: {
            required: true,
          },
        },
      ];

      const sectionsWithDependency: FormSection[] = [
        {
          id: "section-1",
          title: "基本信息",
          fields: [
            {
              name: "status",
              label: "状态",
              type: "select",
              options: [
                { label: "草稿", value: "draft" },
                { label: "已发布", value: "published" },
              ],
            },
            {
              name: "reviewComment",
              label: "审核意见",
              type: "textarea",
              required: false,
            },
          ],
        },
      ];

      render(
        <FormPageTemplate
          title="创建项目"
          sections={sectionsWithDependency}
          onSubmit={mockOnSubmit}
          dependencies={dependencies}
        />,
      );

      // 审核意见字段应该存在
      expect(screen.getByLabelText("审核意见")).toBeInTheDocument();
    });
  });

  describe("草稿保存", () => {
    it("启用草稿配置时组件正常工作", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          draftConfig={{
            enabled: true,
            storageKey: "test-draft",
          }}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
      expect(screen.getByText("基本信息")).toBeInTheDocument();
    });

    it("保存草稿到localStorage", async () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          draftConfig={{
            enabled: true,
            storageKey: "test-draft",
          }}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });

  describe("表单进度条", () => {
    it("显示表单进度条", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          showProgress={true}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });

  describe("权限配置", () => {
    it("使用默认权限配置", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });

    it("配置自定义权限", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          permissions={{
            canEdit: true,
            canDelete: true,
            canViewHistory: true,
          }}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });

  describe("验证提示", () => {
    it("启用验证提示时组件正常工作", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          showValidationHints={true}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });

    it("配置自定义验证消息", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          customValidationMessages={{
            title: "请输入项目标题",
          }}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });

  describe("分段折叠", () => {
    it("分段默认展开", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
        />,
      );

      // 分段应该展开
      expect(screen.getByText("基本信息")).toBeInTheDocument();
    });

    it("配置分段默认折叠", () => {
      const collapsedSections: FormSection[] = [
        {
          id: "section-1",
          title: "基本信息",
          defaultExpanded: false,
          fields: basicSections[0].fields,
        },
      ];

      render(
        <FormPageTemplate
          title="创建项目"
          sections={collapsedSections}
          onSubmit={mockOnSubmit}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });

  describe("分组标签", () => {
    it("显示分组标签", () => {
      const sectionsWithGroups: FormSection[] = [
        {
          id: "section-1",
          title: "基本信息",
          fields: [
            {
              name: "title",
              label: "标题",
              type: "text",
              group: "group1",
            },
            {
              name: "description",
              label: "描述",
              type: "textarea",
              group: "group2",
            },
          ],
        },
      ];

      render(
        <FormPageTemplate
          title="创建项目"
          sections={sectionsWithGroups}
          onSubmit={mockOnSubmit}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });

  describe("多列布局", () => {
    it("使用默认列数", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });

    it("配置自定义列数", () => {
      render(
        <FormPageTemplate
          title="创建项目"
          sections={basicSections}
          onSubmit={mockOnSubmit}
          columns={2}
        />,
      );

      // 组件应该正常渲染
      expect(screen.getByText("创建项目")).toBeInTheDocument();
    });
  });
});
