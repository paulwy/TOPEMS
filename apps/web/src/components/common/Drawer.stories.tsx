import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import Drawer from './Drawer';

const meta = {
  title: 'Common/Drawer',
  component: Drawer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '抽屉组件，支持四向锚点、标题栏、关闭方式与宽高配置，适合侧边详情、表单编辑与筛选面板场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: { description: '是否打开', control: 'boolean' },
    anchor: {
      description: '锚点方向',
      control: 'select',
      options: ['left', 'right', 'top', 'bottom'],
    },
    variant: {
      description: '变体',
      control: 'select',
      options: ['temporary', 'persistent', 'permanent'],
    },
    title: { description: '标题', control: 'text' },
    width: { description: '宽度（anchor 为 left/right 时）', control: 'number' },
    height: { description: '高度（anchor 为 top/bottom 时）', control: 'number' },
    showCloseButton: { description: '是否显示关闭按钮', control: 'boolean' },
    showDivider: { description: '标题栏是否显示分隔线', control: 'boolean' },
    closable: { description: '是否允许关闭', control: 'boolean' },
    closeOnBackdropClick: { description: '点击遮罩是否关闭', control: 'boolean' },
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: '详情抽屉',
    width: 360,
    children: '抽屉内容区',
    onClose: fn(),
  },
};

export const RightPersistent: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button onClick={() => setOpen(!open)}>切换抽屉</button>
        <Drawer
          {...args}
          open={open}
          onClose={() => setOpen(false)}
        >
          <div style={{ padding: 16 }}>持久化右侧抽屉示例：点击外部按钮切换开合。</div>
        </Drawer>
      </div>
    );
  },
  args: {
    anchor: 'right',
    variant: 'persistent',
    title: '筛选面板',
    width: 320,
  },
};

export const BottomSheet: Story = {
  args: {
    open: true,
    anchor: 'bottom',
    height: 240,
    title: '底部面板',
    showDivider: true,
    onClose: fn(),
    children: '底部弹出的快捷面板内容',
  },
};
