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
        component: '移动端滑动操作组件，支持左右两侧动作按钮与开合回调，适合列表项快捷操作场景。',
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
    icon: <Edit2 size={18} />,
    label: '编辑',
    color: designTokens.colors.primary[700],
    onClick: () => {},
  },
  {
    id: 'delete',
    icon: <Trash2 size={18} />,
    label: '删除',
    color: '#d32f2f',
    onClick: () => {},
  },
];

const archiveAndStarActions: SwipeActionItem[] = [
  {
    id: 'archive',
    icon: <Archive size={18} />,
    label: '归档',
    color: designTokens.colors.secondary[700],
    onClick: () => {},
  },
  {
    id: 'star',
    icon: <Star size={18} />,
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
