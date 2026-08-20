import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTheme } from '@mui/material';
import { useState } from 'react';

import { LoadingSpinner, LoadingOverlay, SkeletonLoader } from './LoadingSpinner';

const meta = {
  title: 'Common/Loading',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '加载状态组件，包括 LoadingSpinner、LoadingOverlay 和 SkeletonLoader。',
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

const SpinnerDefault: Story = {
  args: {
    size: 'md',
  },
};

const SpinnerSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <LoadingSpinner size='sm' />
      <LoadingSpinner size='md' />
      <LoadingSpinner size='lg' />
    </div>
  ),
};

const OverlayWithToggle: Story = {
  render: () => {
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(true);

    return (
      <div>
        <button onClick={() => setIsLoading(!isLoading)}>
          {isLoading ? '隐藏加载' : '显示加载'}
        </button>
        <div style={{ marginTop: '16px', position: 'relative', width: '200px', height: '100px' }}>
          <LoadingOverlay
            isLoading={isLoading}
            message='加载中...'
          >
            <div
              style={{ padding: '16px', background: theme.palette.grey[100], borderRadius: '8px' }}
            >
              内容区域
            </div>
          </LoadingOverlay>
        </div>
      </div>
    );
  },
};

export const Skeleton: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
      <SkeletonLoader style={{ height: '20px' }} />
      <SkeletonLoader style={{ height: '20px', width: '80%' }} />
      <SkeletonLoader style={{ height: '20px', width: '60%' }} />
    </div>
  ),
};

const CardSkeleton: Story = {
  render: () => (
    <div
      style={{
        width: '300px',
        padding: '16px',
        border: '1px solid grey.200',
        borderRadius: '8px',
      }}
    >
      <SkeletonLoader style={{ height: '120px', marginBottom: '16px' }} />
      <SkeletonLoader style={{ height: '20px', width: '70%', marginBottom: '8px' }} />
      <SkeletonLoader style={{ height: '16px', width: '90%', marginBottom: '4px' }} />
      <SkeletonLoader style={{ height: '16px', width: '50%' }} />
    </div>
  ),
};
