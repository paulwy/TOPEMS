import type { Meta, StoryObj } from '@storybook/react-vite';

import StatusTimeline from './StatusTimeline';

const meta = {
  title: 'Common/StatusTimeline',
  component: StatusTimeline,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '状态时间线组件，展示流程节点的状态演进（完成/当前/待办/失败/警告），支持横向布局与自定义圆点，适合审批流、工单流转场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: { description: '方向', control: 'select', options: ['vertical', 'horizontal'] },
    showLabels: { description: '是否显示状态标签', control: 'boolean' },
    showIcons: { description: '是否显示状态图标', control: 'boolean' },
    dotSize: { description: '圆点尺寸（px）', control: 'number' },
    items: { description: '节点列表（id/title/status/time 等）', control: false },
  },
} satisfies Meta<typeof StatusTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const flowItems = [
  { id: '1', title: '创建工单', status: 'completed', time: '09:00', user: '张三' },
  { id: '2', title: '主管审批', status: 'completed', time: '09:20', user: '李四' },
  { id: '3', title: '技术处理', status: 'current', time: '10:05', user: '王五' },
  { id: '4', title: '验收关闭', status: 'pending' },
] as const;

export const Default: Story = {
  args: { items: flowItems as never },
};

export const Horizontal: Story = {
  args: { items: flowItems as never, orientation: 'horizontal', showLabels: true, showIcons: true },
};

export const WithFailed: Story = {
  args: {
    items: [
      { id: '1', title: '提交申请', status: 'completed', time: '昨日 14:00' },
      { id: '2', title: '资料审核', status: 'failed', time: '昨日 15:30', user: '审核员' },
      { id: '3', title: '重新提交', status: 'warning', description: '资料不完整' },
    ] as never,
  },
};
