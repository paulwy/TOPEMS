import type { Meta, StoryObj } from '@storybook/react-vite';

import { DescriptionList } from './DescriptionList';

const meta = {
  title: 'Common/DescriptionList',
  component: DescriptionList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '描述列表组件，支持垂直/网格布局、可复制文本、工具提示、加载骨架屏等功能。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      description: '布局方向',
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    columns: {
      description: '列数',
      control: 'select',
      options: [1, 2, 3, 4],
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    divider: {
      description: '是否显示分隔线',
      control: 'boolean',
    },
    gap: {
      description: '间距',
      control: 'number',
    },
  },
} satisfies Meta<typeof DescriptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicItems = [
  { label: '姓名', value: '张三' },
  { label: '部门', value: '技术研发部' },
  { label: '职位', value: '高级工程师' },
  { label: '邮箱', value: 'zhangsan@topems.com' },
  { label: '入职日期', value: '2023-03-15' },
  { label: '工号', value: 'EMP-20230315-001' },
];

export const Default: Story = {
  args: {
    items: basicItems,
    direction: 'vertical',
    columns: 2,
  },
};

export const VerticalLayout: Story = {
  args: {
    items: basicItems,
    direction: 'vertical',
    columns: 1,
  },
};

export const GridLayout: Story = {
  args: {
    items: [
      { label: '姓名', value: '张三' },
      { label: '部门', value: '技术研发部' },
      { label: '职位', value: '高级工程师' },
      { label: '邮箱', value: 'zhangsan@topems.com' },
      { label: '手机号', value: '138-0000-1234' },
      { label: '工号', value: 'EMP-20230315-001' },
      { label: '入职日期', value: '2023-03-15' },
      { label: '直属上级', value: '李四' },
    ],
    direction: 'vertical',
    columns: 4,
  },
};

export const WithCopyableItems: Story = {
  args: {
    items: [
      { label: 'API Key', value: 'sk-abc123def456ghi789', copyable: true },
      { label: '仓库地址', value: 'https://github.com/topems/core', copyable: true },
      { label: '文档链接', value: 'https://docs.topems.com', copyable: true },
    ],
    direction: 'vertical',
    columns: 1,
  },
};

export const WithTooltips: Story = {
  args: {
    items: [
      { label: '订单编号', value: 'ORD-20240315-0001', tooltip: '系统自动生成的唯一订单标识' },
      { label: '订单状态', value: '已完成', tooltip: '当前订单的流转状态' },
      { label: '创建时间', value: '2024-03-15 10:30:00', tooltip: '订单首次创建的时间戳' },
    ],
    direction: 'vertical',
    columns: 1,
  },
};

export const LoadingSkeleton: Story = {
  args: {
    items: [
      { label: '姓名', value: '', loading: true },
      { label: '部门', value: '', loading: true },
      { label: '职位', value: '', loading: true },
      { label: '邮箱', value: '', loading: true },
    ],
    direction: 'vertical',
    columns: 2,
  },
};

export const WithDivider: Story = {
  args: {
    items: [
      { label: '基本信息', value: '张三 / 技术研发部', span: 'full' },
      { label: '职位', value: '高级工程师' },
      { label: '工号', value: 'EMP-001' },
      { label: '联系方式', value: '138-0000-1234', span: 'full' },
    ],
    direction: 'vertical',
    columns: 2,
    divider: true,
  },
};

export const LargeSize: Story = {
  args: {
    items: [
      { label: '项目名称', value: 'TOPEMS 管理系统' },
      { label: '版本号', value: 'v2.0.0' },
      { label: '负责人', value: '张三' },
    ],
    direction: 'vertical',
    columns: 1,
    size: 'large',
  },
};

export const SmallSize: Story = {
  args: {
    items: [
      { label: '标签', value: 'Production' },
      { label: '区域', value: 'cn-beijing' },
      { label: '实例', value: 'i-2ze3k8o9x1m7n5p4q' },
    ],
    direction: 'vertical',
    columns: 3,
    size: 'small',
  },
};
