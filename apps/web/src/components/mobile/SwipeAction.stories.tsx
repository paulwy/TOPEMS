import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { Edit2, Trash2, Archive, Star } from 'lucide-react';

import { SwipeAction } from './SwipeAction';
import type { SwipeActionItem } from './SwipeAction';
import { designTokens } from '@topems/tokens';

const meta = {
  title: 'Mobile/SwipeAction',
  component: SwipeAction,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '滑动操作组件，支持左滑和右滑触发自定义操作按钮，适用于移动端列表项快捷操作。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SwipeAction>;

export default meta;
type Story = StoryObj<typeof meta>;

const deleteAndEditActions: SwipeActionItem[] = [
  {
    id: 'edit',
    icon: <Edit2 style={{ width: 18, height: 18 }} />,
    label: '编辑',
    color: designTokens.colors.primary[700],
    onClick: () => {},
  },
  {
    id: 'delete',
    icon: <Trash2 style={{ width: 18, height: 18 }} />,
    label: '删除',
    color: '#d32f2f',
    onClick: () => {},
  },
];

const archiveAndStarActions: SwipeActionItem[] = [
  {
    id: 'archive',
    icon: <Archive style={{ width: 18, height: 18 }} />,
    label: '归档',
    color: designTokens.colors.secondary[700],
    onClick: () => {},
  },
  {
    id: 'star',
    icon: <Star style={{ width: 18, height: 18 }} />,
    label: '收藏',
    color: '#f57c00',
    onClick: () => {},
  },
];

const ListItem = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2,
      backgroundColor: 'background.paper',
    }}
  >
    <Box sx={{ flex: 1 }}>
      <Typography
        variant='body2'
        sx={{ fontWeight: 500 }}
      >
        {title}
      </Typography>
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

export const Default: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mb: 1, display: 'block' }}
      >
        左滑显示操作按钮
      </Typography>
      <SwipeAction rightActions={deleteAndEditActions}>
        <ListItem
          title='生产工单 #PO-2024-0089'
          subtitle='状态: 进行中 | 负责人: 张三'
        />
      </SwipeAction>
      <SwipeAction rightActions={deleteAndEditActions}>
        <ListItem
          title='采购申请 #PR-2024-0156'
          subtitle='状态: 待审核 | 金额: 52,800'
        />
      </SwipeAction>
      <SwipeAction rightActions={deleteAndEditActions}>
        <ListItem
          title='质检报告 #QC-2024-0034'
          subtitle='状态: 已完成 | 合格率: 98.5%'
        />
      </SwipeAction>
    </Box>
  ),
};

const MultipleActions: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mb: 1, display: 'block' }}
      >
        多个操作按钮（归档 + 收藏）
      </Typography>
      <SwipeAction rightActions={[...archiveAndStarActions, ...deleteAndEditActions]}>
        <ListItem
          title='设备维护单 #MT-2024-0012'
          subtitle='设备: 数控机床 A01 | 优先级: 高'
        />
      </SwipeAction>
      <SwipeAction rightActions={archiveAndStarActions}>
        <ListItem
          title='库存调拨单 #TR-2024-0078'
          subtitle='从仓库 A 至仓库 B | 数量: 500'
        />
      </SwipeAction>
    </Box>
  ),
};

export const StaticPreview: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mb: 1, display: 'block' }}
      >
        静态预览 - 展示操作按钮布局
      </Typography>
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            zIndex: 0,
          }}
        >
          <Box
            sx={{
              width: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: designTokens.colors.primary[700],
              color: 'white',
            }}
          >
            <Edit2 style={{ width: 18, height: 18 }} />
            <Typography
              variant='caption'
              sx={{ color: 'white', mt: 0.5 }}
            >
              编辑
            </Typography>
          </Box>
          <Box
            sx={{
              width: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#d32f2f',
              color: 'white',
            }}
          >
            <Trash2 style={{ width: 18, height: 18 }} />
            <Typography
              variant='caption'
              sx={{ color: 'white', mt: 0.5 }}
            >
              删除
            </Typography>
          </Box>
        </Box>
        <Box sx={{ transform: 'translateX(-144px)', position: 'relative', zIndex: 1 }}>
          <ListItem
            title='工作汇报 #RPT-2024-0023'
            subtitle='周报 | 提交时间: 今日 09:30'
          />
        </Box>
      </Box>
    </Box>
  ),
};
