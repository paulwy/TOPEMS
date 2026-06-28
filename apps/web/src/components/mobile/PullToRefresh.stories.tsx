import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, List, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import { FileText, Clock, CheckCircle } from 'lucide-react';

import { PullToRefresh } from './PullToRefresh';

const meta = {
  title: 'Mobile/PullToRefresh',
  component: PullToRefresh,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '下拉刷新组件，包裹内容区域后支持触摸下拉刷新操作，带有加载动画和提示文案。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    threshold: {
      description: '触发刷新的下拉阈值（像素）',
      control: { type: 'number', min: 30, max: 150 },
    },
    maxPullDistance: {
      description: '最大下拉距离（像素）',
      control: { type: 'number', min: 60, max: 300 },
    },
    disabled: {
      description: '是否禁用下拉刷新',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof PullToRefresh>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockItems = [
  { id: '1', icon: <FileText style={{ width: 20, height: 20 }} />, primary: '工单 #WO-2024-0891', secondary: '生产中 | 预计完成: 18:00' },
  { id: '2', icon: <Clock style={{ width: 20, height: 20 }} />, primary: '工单 #WO-2024-0890', secondary: '等待中 | 预计开始: 14:30' },
  { id: '3', icon: <CheckCircle style={{ width: 20, height: 20 }} />, primary: '工单 #WO-2024-0889', secondary: '已完成 | 完成时间: 今日 11:20' },
  { id: '4', icon: <FileText style={{ width: 20, height: 20 }} />, primary: '工单 #WO-2024-0888', secondary: '生产中 | 预计完成: 17:00' },
  { id: '5', icon: <Clock style={{ width: 20, height: 20 }} />, primary: '工单 #WO-2024-0887', secondary: '等待中 | 预计开始: 15:00' },
  { id: '6', icon: <CheckCircle style={{ width: 20, height: 20 }} />, primary: '工单 #WO-2024-0886', secondary: '已完成 | 完成时间: 今日 10:45' },
];

export const Default: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto', height: 500, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <PullToRefresh
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }}
      >
        <List disablePadding>
          {mockItems.map((item) => (
            <ListItemButton key={item.id} divider>
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.primary} secondary={item.secondary} />
            </ListItemButton>
          ))}
        </List>
      </PullToRefresh>
    </Box>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto', height: 400, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <PullToRefresh disabled onRefresh={async () => {}}>
        <Box sx={{ p: 3 }}>
          下拉刷新功能已禁用。此模式适用于数据为静态内容的场景。
        </Box>
      </PullToRefresh>
    </Box>
  ),
};

export const StaticPreview: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <Box sx={{ p: 2 }}>
        下拉刷新组件的交互依赖触摸事件，请使用以下方式预览：
      </Box>
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 2 }}>
          <Clock style={{ width: 24, height: 24, color: 'text.secondary' }} />
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>下拉刷新</Box>
        </Box>
        <List disablePadding>
          {mockItems.slice(0, 3).map((item) => (
            <ListItemButton key={item.id} divider>
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.primary} secondary={item.secondary} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  ),
};
