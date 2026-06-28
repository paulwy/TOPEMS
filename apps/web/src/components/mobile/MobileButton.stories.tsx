import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonGroup } from '@mui/material';

import { MobileButton } from './MobileButton';

const meta = {
  title: 'Mobile/MobileButton',
  component: MobileButton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '移动端按钮组件，在 MUI Button 基础上优化了触摸目标尺寸和视觉样式。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '按钮尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    variant: {
      description: '按钮变体',
      control: 'select',
      options: ['contained', 'outlined', 'text'],
    },
    color: {
      description: '按钮颜色',
      control: 'select',
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'inherit'],
    },
    fullWidth: {
      description: '是否撑满宽度',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof MobileButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '默认按钮',
  },
};

export const Variants: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 375, margin: '0 auto' }}>
      <MobileButton variant='contained' color='primary'>
        主要按钮
      </MobileButton>
      <MobileButton variant='contained' color='secondary'>
        次要按钮
      </MobileButton>
      <MobileButton variant='outlined' color='primary'>
        描边按钮
      </MobileButton>
      <MobileButton variant='text' color='primary'>
        文字按钮
      </MobileButton>
    </Box>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 375, margin: '0 auto', alignItems: 'flex-start' }}>
      <MobileButton size='small' variant='contained'>
        小号按钮
      </MobileButton>
      <MobileButton size='medium' variant='contained'>
        中号按钮
      </MobileButton>
      <MobileButton size='large' variant='contained'>
        大号按钮
      </MobileButton>
    </Box>
  ),
};

export const Colors: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 375, margin: '0 auto' }}>
      <MobileButton variant='contained' color='primary'>
        主要
      </MobileButton>
      <MobileButton variant='contained' color='success'>
        成功
      </MobileButton>
      <MobileButton variant='contained' color='warning'>
        警告
      </MobileButton>
      <MobileButton variant='contained' color='error'>
        危险
      </MobileButton>
      <MobileButton variant='contained' color='info'>
        信息
      </MobileButton>
    </Box>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <MobileButton variant='contained' fullWidth>
        提交申请
      </MobileButton>
      <MobileButton variant='outlined' fullWidth>
        取消
      </MobileButton>
    </Box>
  ),
};
