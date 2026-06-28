import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import BackButton from './BackButton';

// ============ Decorator: MemoryRouter for react-router-dom dependency ============

const withMemoryRouter = (StoryFn: () => React.JSX.Element) => (
  <MemoryRouter>
    <StoryFn />
  </MemoryRouter>
);

// ============ Meta ============

const meta = {
  title: 'Common/BackButton',
  component: BackButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '统一返回按钮组件，支持智能返回逻辑。提供三种变体：图标按钮、文字按钮和边框按钮。优先使用来源页返回，fallback 到浏览器后退。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [withMemoryRouter],
  argTypes: {
    variant: {
      description: '按钮变体',
      control: 'select',
      options: ['icon', 'text', 'outlined'],
    },
    size: {
      description: '按钮尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    color: {
      description: '按钮颜色',
      control: 'select',
      options: ['inherit', 'primary', 'secondary', 'default'],
    },
    label: { description: '显示文本', control: 'text' },
    tooltip: { description: 'Tooltip 文本', control: 'text' },
  },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============ Stories ============

export const Default: Story = {
  args: {
    variant: 'icon',
    size: 'medium',
    color: 'inherit',
    fallback: '/',
  },
};

export const WithText: Story = {
  args: {
    variant: 'text',
    label: '返回列表',
    size: 'medium',
    color: 'inherit',
    fallback: '/',
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    label: '返回',
    size: 'medium',
    color: 'primary',
    fallback: '/',
  },
};

export const WithCustomLabel: Story = {
  args: {
    variant: 'text',
    label: '返回订单列表',
    size: 'large',
    color: 'primary',
    tooltip: '返回到订单列表页',
    fallback: '/orders',
  },
};

export const CustomOnBack: Story = {
  args: {
    variant: 'text',
    label: '自定义返回',
    size: 'medium',
    color: 'secondary',
    onClick: fn(),
  },
};
