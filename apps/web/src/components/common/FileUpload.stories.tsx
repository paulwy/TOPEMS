import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import FileUpload from './FileUpload';

const meta = {
  title: 'Common/FileUpload',
  component: FileUpload,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '文件上传组件，支持多文件、格式/单文件/总量大小限制，适合附件收集场景。',
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
      description: '单个文件最大大小 (MB)',
      control: 'number',
    },
    maxTotalSize: {
      description: '总文件最大大小 (MB)',
      control: 'number',
    },
    height: {
      description: '上传区域高度',
      control: 'number',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
  },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxCount: 5,
    maxSize: 10,
    maxTotalSize: 50,
    height: 150,
  },
};

const WithFileRestrictions: Story = {
  args: {
    maxCount: 3,
    maxSize: 5,
    maxTotalSize: 15,
    accept: ['.pdf', '.doc', '.docx'],
    height: 150,
  },
};

export const LargeUploadArea: Story = {
  args: {
    maxCount: 10,
    maxSize: 20,
    maxTotalSize: 100,
    height: 250,
  },
};

const SingleFile: Story = {
  args: {
    maxCount: 1,
    maxSize: 10,
    height: 120,
  },
};

export const Disabled: Story = {
  args: {
    maxCount: 5,
    maxSize: 10,
    height: 150,
    disabled: true,
  },
};
