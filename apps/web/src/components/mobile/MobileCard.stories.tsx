import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Chip } from '@mui/material';
import { FileText, Bell, Settings } from 'lucide-react';

import { MobileCard } from './MobileCard';

const meta = {
  title: 'Mobile/MobileCard',
  component: MobileCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '移动端卡片组件，支持标题、副标题、图标、箭头、徽章等多种展示形态。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: '卡片标题',
      control: 'text',
    },
    subtitle: {
      description: '卡片副标题',
      control: 'text',
    },
    showArrow: {
      description: '是否显示右侧箭头',
      control: 'boolean',
    },
    divider: {
      description: '是否显示底部边框',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof MobileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <MobileCard
        title='消息通知'
        subtitle='您有 3 条未读消息'
        leftIcon={<Bell style={{ width: 20, height: 20 }} />}
        showArrow
        divider
      />
      <MobileCard
        title='审批中心'
        subtitle='待审批工单 5 件'
        leftIcon={<FileText style={{ width: 20, height: 20 }} />}
        showArrow
        divider
      />
      <MobileCard
        title='系统设置'
        subtitle='账户与偏好'
        leftIcon={<Settings style={{ width: 20, height: 20 }} />}
        showArrow
      />
    </Box>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <MobileCard
        title='生产任务'
        subtitle='进行中'
        badge={
          <Chip
            label='紧急'
            size='small'
            color='error'
          />
        }
        showArrow
        divider
      />
      <MobileCard
        title='质量检测'
        subtitle='已通过'
        badge={
          <Chip
            label='正常'
            size='small'
            color='success'
          />
        }
        showArrow
        divider
      />
      <MobileCard
        title='库存预警'
        subtitle='物料 A 已低于安全库存'
        badge={
          <Chip
            label='预警'
            size='small'
            color='warning'
          />
        }
        showArrow
      />
    </Box>
  ),
};

export const WithoutIcon: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <MobileCard
        title='设备编号: DEV-2024-001'
        subtitle='运行正常 | 运行时长: 1,280 小时'
        rightContent={
          <Chip
            label='在线'
            size='small'
            color='success'
            variant='outlined'
          />
        }
        divider
      />
      <MobileCard
        title='设备编号: DEV-2024-002'
        subtitle='维护中 | 预计恢复: 14:00'
        rightContent={
          <Chip
            label='维护'
            size='small'
            color='warning'
            variant='outlined'
          />
        }
      />
    </Box>
  ),
};

export const ListStyle: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      {[
        { name: '张三', dept: '研发部', role: '高级工程师' },
        { name: '李四', dept: '市场部', role: '市场经理' },
        { name: '王五', dept: '销售部', role: '销售总监' },
        { name: '赵六', dept: '财务部', role: '财务主管' },
      ].map((item) => (
        <MobileCard
          key={item.name}
          title={item.name}
          subtitle={`${item.dept} | ${item.role}`}
          showArrow
          divider
        />
      ))}
    </Box>
  ),
};
