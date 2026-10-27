import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Box, Typography, Button, Chip } from '@mui/material';
import PageContainer from './PageContainer';

// ============ Meta ============

const meta = {
  title: 'Common/PageContainer',
  component: PageContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '页面容器组件，提供统一的页面布局、背景色、最大宽度和内边距。支持自定义 header slot、骨架屏加载态、Paper 包裹等特性。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    maxWidth: {
      description: '内容区域最大宽度',
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    padding: { description: '是否显示内边距', control: 'boolean' },
    paper: { description: '是否用 Paper 包裹内容', control: 'boolean' },
    loading: { description: '是否显示加载骨架屏', control: 'boolean' },
  },
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============ Sample Content ============

const SampleContent = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Typography variant='h6'>页面内容区域</Typography>
    <Typography
      variant='body2'
      color='text.secondary'
    >
