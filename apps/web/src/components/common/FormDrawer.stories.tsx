import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import FormDrawer from './FormDrawer';

const meta = {
  title: 'Common/FormDrawer',
  component: FormDrawer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '表单抽屉组件，内置标题、确认/取消按钮与提交态，适合表单字段较多、需侧边编辑的场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: { description: '是否打开', control: 'boolean' },
    title: { description: '标题', control: 'text' },
    loading: { description: '提交中状态', control: 'boolean' },
    width: { description: '宽度（px）', control: 'number' },
    anchor: {
      description: '锚点方向',
      control: 'select',
      options: ['left', 'right', 'top', 'bottom'],
    },
    confirmText: { description: '确认按钮文案', control: 'text' },
    cancelText: { description: '取消按钮文案', control: 'text' },
    disableSubmit: { description: '禁用确认按钮', control: 'boolean' },
    closeOnBackdropClick: { description: '点击遮罩是否关闭', control: 'boolean' },
  },
} satisfies Meta<typeof FormDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button onClick={() => setOpen(true)}>打开表单</button>
        <FormDrawer
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              placeholder='名称'
              style={{ padding: 8 }}
            />
            <input
              placeholder='描述'
              style={{ padding: 8 }}
            />
            <textarea
              placeholder='备注'
              style={{ padding: 8, minHeight: 80 }}
            />
          </div>
        </FormDrawer>
      </div>
    );
  },
  args: { title: '编辑记录', width: 400, confirmText: '保存', onClose: fn(), onSubmit: fn() },
};

export const Loading: Story = {
  args: {
    open: true,
    title: '提交中',
    loading: true,
    width: 400,
    children: '表单内容（提交期间按钮禁用）',
    onClose: fn(),
  },
};
