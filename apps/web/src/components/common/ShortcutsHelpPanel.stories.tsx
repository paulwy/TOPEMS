import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import ShortcutsHelpPanel from './ShortcutsHelpPanel';

const meta = {
  title: 'Common/ShortcutsHelpPanel',
  component: ShortcutsHelpPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '快捷键帮助面板，展示全局快捷键说明，支持开关控制，适合复杂应用内的操作指引场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: { description: '是否打开', control: 'boolean' },
    onClose: { description: '关闭回调', control: false },
  },
} satisfies Meta<typeof ShortcutsHelpPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <button onClick={() => setOpen(!open)}>切换帮助面板</button>
        <ShortcutsHelpPanel
          {...args}
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      </div>
    );
  },
  args: { onClose: fn() },
};

export const Open: Story = {
  args: { isOpen: true, onClose: fn() },
};
