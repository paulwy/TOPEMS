import type { Meta, StoryObj } from '@storybook/react-vite';

import PageTransition from './PageTransition';

const meta = {
  title: 'Mobile/PageTransition',
  component: PageTransition,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '页面过渡动画组件，包裹页面内容并控制切入方向与时长，适合移动端页面切换的动效场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      description: '切入方向',
      control: 'select',
      options: ['left', 'right', 'up', 'down', 'fade'],
    },
    duration: { description: '动画时长（ms）', control: 'number' },
  },
} satisfies Meta<typeof PageTransition>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div
      style={{
        width: 320,
        height: 480,
        border: '1px solid #eee',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <PageTransition {...args}>
        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, #e3f2fd, #f3e5f5)',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h3>页面内容</h3>
          <p style={{ color: '#666' }}>切换时此内容会按方向滑入。</p>
        </div>
      </PageTransition>
    </div>
  ),
  args: { direction: 'right', duration: 300 },
};

export const Fade: Story = {
  args: { direction: 'fade', duration: 500 },
};
