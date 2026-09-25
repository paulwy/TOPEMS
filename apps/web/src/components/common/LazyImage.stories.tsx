import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import LazyImage from './LazyImage';

const meta = {
  title: 'Common/LazyImage',
  component: LazyImage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '懒加载图片组件，支持占位图与失败兜底，适合长列表、详情页中的图片延迟加载场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    src: { description: '图片地址', control: 'text' },
    alt: { description: '替代文本', control: 'text' },
    placeholder: { description: '加载中占位内容', control: 'text' },
    fallback: { description: '加载失败兜底内容', control: 'text' },
    onLoad: { description: '加载完成回调', control: false },
    onError: { description: '加载失败回调', control: false },
  },
} satisfies Meta<typeof LazyImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div
      style={{
        width: 240,
        height: 160,
        border: '1px solid #eee',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <LazyImage {...args} />
    </div>
  ),
  args: { src: 'https://picsum.photos/seed/topems/480/320', alt: '示例图片', onLoad: fn() },
};

export const WithPlaceholder: Story = {
  render: (args) => (
    <div
      style={{
        width: 240,
        height: 160,
        border: '1px solid #eee',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#f5f5f5',
      }}
    >
      <LazyImage {...args} />
    </div>
  ),
  args: {
    src: 'https://picsum.photos/seed/topems2/480/320',
    alt: '示例图片',
    placeholder: '加载中…',
  },
};
