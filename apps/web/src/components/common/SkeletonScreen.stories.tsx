import type { Meta, StoryObj } from '@storybook/react-vite';
import SkeletonScreen from './SkeletonScreen';

const meta = {
  title: 'Common/SkeletonScreen',
  component: SkeletonScreen,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '骨架屏占位组件，支持 dashboard / list / form / detail 四种预设布局。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['dashboard', 'list', 'form', 'detail'] },
  },
} satisfies Meta<typeof SkeletonScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashboard: Story = {
  args: { variant: 'dashboard' },
  parameters: { layout: 'fullscreen' },
};

export const List: Story = {
  args: { variant: 'list' },
};

export const Form: Story = {
  args: { variant: 'form' },
};

export const Detail: Story = {
  args: { variant: 'detail' },
};
