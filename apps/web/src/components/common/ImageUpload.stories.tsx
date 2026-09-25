import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import ImageUpload from './ImageUpload';

const meta = {
  title: 'Common/ImageUpload',
  component: ImageUpload,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '图片上传组件，支持多图上传、格式与大小限制、裁剪及比例配置，适合表单图片收集场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    maxCount: {
      description: '最大上传数量',
      control: 'number',
    },
    maxSize: {
      description: '单张图片最大大小 (MB)',
      control: 'number',
    },
    height: {
      description: '上传区域高度',
      control: 'number',
    },
    cropEnabled: {
      description: '是否支持裁剪',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
  },
} satisfies Meta<typeof ImageUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxCount: 9,
    maxSize: 5,
    height: 200,
  },
};

const SingleImage: Story = {
  args: {
    maxCount: 1,
    maxSize: 2,
    height: 150,
  },
};

const WithoutCrop: Story = {
  args: {
    maxCount: 6,
    maxSize: 5,
    cropEnabled: false,
    height: 180,
  },
};

export const LargeUploadArea: Story = {
  args: {
    maxCount: 12,
    maxSize: 10,
    height: 300,
  },
};

export const Disabled: Story = {
  args: {
    maxCount: 5,
    maxSize: 5,
    height: 200,
    disabled: true,
  },
};
