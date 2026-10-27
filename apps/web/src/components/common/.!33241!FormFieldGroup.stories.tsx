import type { Meta, StoryObj } from '@storybook/react-vite';

import FormFieldGroup from './FormFieldGroup';
import { TextField, Box } from '@mui/material';

const meta = {
  title: 'Common/FormFieldGroup',
  component: FormFieldGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '表单字段分组组件，支持标题、描述、提示、折叠与多列布局，适合复杂表单的结构化组织。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: '分组标题',
      control: 'text',
    },
    description: {
      description: '描述说明',
      control: 'text',
    },
    tooltip: {
      description: '工具提示内容',
      control: 'text',
    },
    collapsible: {
      description: '是否可折叠',
      control: 'boolean',
    },
    defaultExpanded: {
      description: '默认展开状态',
      control: 'boolean',
    },
    columns: {
      description: '列数（网格布局）',
      control: 'select',
      options: [undefined, 1, 2, 3, 4],
    },
    required: {
      description: '是否显示必填标记',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof FormFieldGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box sx={{ width: 500 }}>
      <FormFieldGroup
