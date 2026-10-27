import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import FormDialog from './FormDialog';

const meta = {
  title: 'Common/FormDialog',
  component: FormDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '表单对话框组件，内置标题、确认/取消按钮与提交态（loading），适合新建、编辑等表单弹窗场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: { description: '是否打开', control: 'boolean' },
    title: { description: '标题', control: 'text' },
    loading: { description: '提交中状态（禁用按钮 + 加载指示）', control: 'boolean' },
    maxWidth: {
      description: '最大宽度',
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    confirmText: { description: '确认按钮文案', control: 'text' },
    cancelText: { description: '取消按钮文案', control: 'text' },
    disableSubmit: { description: '禁用确认按钮', control: 'boolean' },
    hideCancelButton: { description: '隐藏取消按钮', control: 'boolean' },
    closeOnBackdropClick: { description: '点击遮罩是否关闭', control: 'boolean' },
    showDivider: { description: '标题栏分隔线', control: 'boolean' },
  },
} satisfies Meta<typeof FormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button onClick={() => setOpen(true)}>打开表单</button>
        <FormDialog
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
        >
          <input
