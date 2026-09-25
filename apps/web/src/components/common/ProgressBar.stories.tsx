import type { Meta, StoryObj } from '@storybook/react-vite';

import ProgressBar from './ProgressBar';

const meta = {
  title: 'Common/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '进度条组件，展示任务完成度，适合加载、上传、步骤进度等场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      description: '进度值 (0-100)',
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    max: {
      description: '最大值',
      control: { type: 'number', min: 1 },
    },
    variant: {
      description: '进度条变体',
      control: 'select',
      options: ['linear', 'circular', 'segmented'],
    },
    color: {
      description: '颜色',
      control: 'select',
      options: ['primary', 'success', 'warning', 'error', 'gradient'],
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    animated: {
      description: '是否显示动画',
      control: 'boolean',
    },
    striped: {
      description: '是否显示条纹',
      control: 'boolean',
    },
    showValue: {
      description: '是否显示数值',
      control: 'boolean',
    },
    label: {
      description: '标签文本',
      control: 'text',
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
  },
};

const LinearVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <ProgressBar
        value={30}
        color='primary'
      />
      <ProgressBar
        value={60}
        color='success'
      />
      <ProgressBar
        value={45}
        color='warning'
      />
      <ProgressBar
        value={80}
        color='error'
      />
      <ProgressBar
        value={50}
        color='gradient'
      />
    </div>
  ),
};

const Circular: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
      <ProgressBar
        value={30}
        variant='circular'
        color='primary'
      />
      <ProgressBar
        value={60}
        variant='circular'
        color='success'
      />
      <ProgressBar
        value={45}
        variant='circular'
        color='warning'
      />
      <ProgressBar
        value={80}
        variant='circular'
        color='error'
      />
      <ProgressBar
        value={50}
        variant='circular'
        color='gradient'
      />
    </div>
  ),
};

const Segmented: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <ProgressBar
        value={30}
        variant='segmented'
        segments={10}
      />
      <ProgressBar
        value={60}
        variant='segmented'
        segments={10}
      />
      <ProgressBar
        value={45}
        variant='segmented'
        segments={20}
      />
    </div>
  ),
};

const WithLabel: Story = {
  args: {
    value: 75,
    label: '上传进度',
    showValue: true,
  },
};

const Animated: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <ProgressBar
        value={40}
        animated
        color='primary'
      />
      <ProgressBar
        value={60}
        animated
        color='gradient'
      />
      <ProgressBar
        value={80}
        animated
        variant='circular'
        color='gradient'
      />
    </div>
  ),
};

const Striped: Story = {
  args: {
    value: 65,
    striped: true,
    animated: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <ProgressBar
        value={50}
        size='small'
      />
      <ProgressBar
        value={50}
        size='medium'
      />
      <ProgressBar
        value={50}
        size='large'
      />
    </div>
  ),
};
