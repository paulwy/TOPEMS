import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Box } from '@mui/material';
import AlertCard, {
  SuccessAlertCard,
  WarningAlertCard,
  ErrorAlertCard,
  InfoAlertCard,
} from './AlertCard';

const meta = {
  title: 'Common/AlertCard',
  component: AlertCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '统一的警告卡片组件，支持 success / warning / error / info 四种级别、card / alert / inline 三种模式、可关闭/可展开。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    level: { control: 'select', options: ['success', 'warning', 'error', 'info'] },
    displayMode: { control: 'select', options: ['card', 'alert', 'inline'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof AlertCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    level: 'success',
    title: '操作成功',
    message: '数据已保存，所有更改已生效。',
    closable: true,
    onClose: fn(),
  },
};

export const Warning: Story = {
  args: {
    level: 'warning',
    title: '请确认操作',
    message: '该操作将影响 128 条关联数据，建议在执行前做好备份。',
    closable: true,
  },
};

export const Error: Story = {
  args: {
    level: 'error',
    title: '操作失败',
    message: '网络连接超时（ERR_NETWORK_TIMEOUT），请检查网络后重试。',
    closable: true,
    actions: [
      { label: '重试', primary: true, onClick: fn() },
      { label: '取消', onClick: fn() },
    ],
  },
};

export const Info: Story = {
  args: {
    level: 'info',
    title: '系统通知',
    message: '系统将于今晚 22:00 进行维护升级，预计持续 2 小时。',
    closable: true,
    actions: [{ label: '知道了', primary: true, onClick: fn() }],
  },
};

const Expandable: Story = {
  args: {
    level: 'warning',
    title: '检测到异常',
    message: '3 台设备温度超过阈值，点击展开查看详细信息。',
    expandable: true,
    actions: [{ label: '查看详情', onClick: fn() }],
  },
};

const InlineMode: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <AlertCard
        level='success'
        message='已自动保存'
        displayMode='inline'
        size='sm'
      />
      <AlertCard
        level='warning'
        message='即将超时'
        displayMode='inline'
        size='sm'
      />
      <AlertCard
        level='error'
        message='连接断开'
        displayMode='inline'
        size='sm'
      />
      <AlertCard
        level='info'
        message='有新消息'
        displayMode='inline'
        size='sm'
      />
    </Box>
  ),
};

const PresetComponents: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SuccessAlertCard
        title='发布完成'
        message='v2.3.1 已成功部署到生产环境。'
      />
      <WarningAlertCard
        title='磁盘告警'
        message='/data 分区使用率已达 85%，建议清理。'
      />
      <ErrorAlertCard
        title='服务异常'
        message='订单服务连续 3 次健康检查失败，已自动重启。'
      />
      <InfoAlertCard
        title='版本更新'
        message='新版本 v2.4.0 已发布，点击查看更新日志。'
      />
    </Box>
  ),
};
