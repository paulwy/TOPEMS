import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import ReportDesignerTemplate from './ReportDesignerTemplate/index';

const meta = {
  title: 'Templates/ReportDesignerTemplate',
  component: ReportDesignerTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '报表设计器模板，提供数据源选择、字段配置、筛选与分组编排的完整设计工作区，适合报表构建类页面场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: { description: '页面标题', control: 'text' },
    subtitle: { description: '副标题', control: 'text' },
    loading: { description: '加载态', control: 'boolean' },
    onSave: { description: '保存回调', control: false },
    onExport: { description: '导出回调', control: false },
    onPreview: { description: '预览回调', control: false },
  },
} satisfies Meta<typeof ReportDesignerTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '报表设计器',
    subtitle: '配置数据源与字段编排',
    availableTables: [
      { name: 'orders', label: '订单表' },
      { name: 'customers', label: '客户表' },
      { name: 'products', label: '产品表' },
    ],
    onSave: fn(),
    onExport: fn(),
    onPreview: fn(),
  },
};

export const Loading: Story = {
  args: {
    title: '报表设计器',
    loading: true,
    availableTables: [],
    onSave: fn(),
    onExport: fn(),
    onPreview: fn(),
  },
};
