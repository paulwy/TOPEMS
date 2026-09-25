import type { Meta, StoryObj } from '@storybook/react-vite';

import LoadingSpinner from './LoadingSpinner';

const meta = {
  title: 'Common/Loading',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '加载指示器组件，提供统一的加载中反馈，适合异步请求与页面过渡场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '尺寸',
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpinnerDefault: Story = {
  args: {
    size: 'md',
  },
};

export const SpinnerSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <LoadingSpinner size='sm' />
      <LoadingSpinner size='md' />
      <LoadingSpinner size='lg' />
    </div>
  ),
};
