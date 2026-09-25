import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import HelpButton from './HelpButton';

const meta = {
  title: 'Common/HelpButton',
  component: HelpButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '帮助按钮组件，点击弹出说明内容（Tooltip/Popover），支持标题、文案与尺寸配置，适合表单与页面的引导提示场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: { description: '帮助标题', control: 'text' },
    content: { description: '帮助内容', control: 'text' },
    size: { description: '按钮尺寸', control: 'select', options: ['small', 'medium', 'large'] },
    tooltip: { description: '悬停提示', control: 'text' },
    disabled: { description: '禁用', control: 'boolean' },
    maxWidth: { description: '内容最大宽度（px）', control: 'number' },
  },
} satisfies Meta<typeof HelpButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: '操作说明', content: '点击按钮查看当前字段的填写说明与注意事项。' },
};

export const WithTooltip: Story = {
  args: {
    title: '审批流程',
    content: '提交后依次流转至主管、部门负责人与财务复核，全程可追踪。',
    tooltip: '查看审批流程说明',
    size: 'large',
  },
};
