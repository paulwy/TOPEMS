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
      这是 PageContainer 包裹的内容区域。PageContainer 提供统一的外层布局，
      包括最大宽度控制、水平内边距和底部内边距。
    </Typography>
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Chip
        label='标签一'
        color='primary'
        size='small'
      />
      <Chip
        label='标签二'
        color='secondary'
        size='small'
      />
      <Chip
        label='标签三'
        color='default'
        size='small'
      />
    </Box>
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <Button
        variant='contained'
        size='small'
        onClick={fn()}
      >
        主要操作
      </Button>
      <Button
        variant='outlined'
        size='small'
        onClick={fn()}
      >
        次要操作
      </Button>
    </Box>
  </Box>
);

// ============ Stories ============

export const Default: Story = {
  args: {
    children: <SampleContent />,
    title: '用户管理',
  },
};

export const WithHeader: Story = {
  args: {
    children: <SampleContent />,
    header: (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography
            variant='h5'
            fontWeight={600}
          >
            订单管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理系统内所有销售订单
          </Typography>
        </Box>
        <Button
          variant='contained'
          size='small'
          onClick={fn()}
        >
          新建订单
        </Button>
      </Box>
    ),
  },
};

export const Loading: Story = {
  args: {
    children: <SampleContent />,
    loading: true,
    title: '加载中',
  },
};

export const WithCustomWidth: Story = {
  args: {
    children: <SampleContent />,
    title: '窄布局页面',
    maxWidth: 'sm',
  },
};

export const WithBackgroundColor: Story = {
  args: {
    children: <SampleContent />,
    title: '自定义背景色',
    bgcolor: '#f5f0ff',
    padding: true,
  },
};
