import type { Meta, StoryObj } from '@storybook/react-vite';

import RelativeTime from './RelativeTime';

const now = new Date();
const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const meta = {
  title: 'Common/RelativeTime',
  component: RelativeTime,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '相对时间显示组件，自动将时间转换为相对格式（如"3分钟前"）。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    date: {
      description: '日期值',
      control: 'text',
    },
    showAbsolute: {
      description: '是否同时显示绝对时间',
      control: 'boolean',
    },
    updateInterval: {
      description: '更新间隔 (ms)',
      control: 'number',
    },
  },
} satisfies Meta<typeof RelativeTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: oneHourAgo.toISOString(),
  },
};

const JustNow: Story = {
  args: {
    date: oneMinuteAgo.toISOString(),
  },
};

const HoursAgo: Story = {
  args: {
    date: oneHourAgo.toISOString(),
  },
};

const DaysAgo: Story = {
  args: {
    date: oneDayAgo.toISOString(),
  },
};

const WeeksAgo: Story = {
  args: {
    date: oneWeekAgo.toISOString(),
  },
};

const WithAbsoluteTime: Story = {
  args: {
    date: oneDayAgo.toISOString(),
    showAbsolute: true,
  },
};

const MultipleTimes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 400 }}>
        <span>1分钟前：</span>
        <RelativeTime date={oneMinuteAgo.toISOString()} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 400 }}>
        <span>1小时前：</span>
        <RelativeTime date={oneHourAgo.toISOString()} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 400 }}>
        <span>1天前：</span>
        <RelativeTime date={oneDayAgo.toISOString()} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 400 }}>
        <span>1周前：</span>
        <RelativeTime date={oneWeekAgo.toISOString()} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 400 }}>
        <span>1月前：</span>
        <RelativeTime date={oneMonthAgo.toISOString()} />
      </div>
    </div>
  ),
};
