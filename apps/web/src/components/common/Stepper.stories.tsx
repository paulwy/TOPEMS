import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import Stepper from './Stepper';
import type { StepItem } from './Stepper';

const defaultSteps: StepItem[] = [
  { label: '填写信息', description: '输入基本信息' },
  { label: '审核确认', description: '主管审核' },
  { label: '完成', description: '流程结束' },
];

const errorSteps: StepItem[] = [
  { label: '提交申请', description: '填写并提交', status: 'completed' },
  { label: '主管审核', description: '等待主管审核', status: 'error' },
  { label: '完成', description: '流程结束', status: 'pending' },
];

const meta = {
  title: 'Common/Stepper',
  component: Stepper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '步骤条组件，支持横向/纵向布局、多种变体和自定义步骤状态。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    activeStep: {
      description: '当前激活步骤索引',
      control: 'number',
    },
    orientation: {
      description: '布局方向',
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    variant: {
      description: '变体样式',
      control: 'select',
      options: ['default', 'outlined', 'gradient'],
    },
    showLabels: {
      description: '是否显示标签',
      control: 'boolean',
    },
    showDescriptions: {
      description: '是否显示描述',
      control: 'boolean',
    },
  },
  args: {
    steps: defaultSteps,
    onStepClick: fn(),
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    steps: defaultSteps,
    activeStep: 1,
  },
};

export const FirstStep: Story = {
  args: {
    steps: defaultSteps,
    activeStep: 0,
  },
};

export const Completed: Story = {
  args: {
    steps: defaultSteps,
    activeStep: 3,
  },
};

export const WithError: Story = {
  args: {
    steps: errorSteps,
    activeStep: 1,
  },
};

export const Vertical: Story = {
  args: {
    steps: defaultSteps,
    activeStep: 1,
    orientation: 'vertical',
  },
  render: (args) => (
    <div style={{ width: 400 }}>
      <Stepper {...args} />
    </div>
  ),
};

export const OutlinedVariant: Story = {
  args: {
    steps: defaultSteps,
    activeStep: 1,
    variant: 'outlined',
  },
};

export const GradientVariant: Story = {
  args: {
    steps: defaultSteps,
    activeStep: 1,
    variant: 'gradient',
  },
};

export const NoDescriptions: Story = {
  args: {
    steps: defaultSteps.map((s) => ({ ...s, description: undefined })),
    activeStep: 1,
    showDescriptions: false,
  },
};

export const ManySteps: Story = {
  args: {
    steps: [
      { label: '创建订单' },
      { label: '支付' },
      { label: '发货' },
      { label: '运输中' },
      { label: '派送' },
      { label: '已签收' },
    ],
    activeStep: 3,
  },
};
