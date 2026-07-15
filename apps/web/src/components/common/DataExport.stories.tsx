import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import DataExport from './DataExport';
import type { ExportField } from './DataExport';

const sampleData: Record<string, unknown>[] = [
  {
    name: '张三',
    department: '研发部',
    position: '前端工程师',
    hireDate: '2024-01-15',
    salary: 15000,
  },
  {
    name: '李四',
    department: '市场部',
    position: '市场经理',
    hireDate: '2023-06-20',
    salary: 18000,
  },
  {
    name: '王五',
    department: '人力资源部',
    position: 'HR专员',
    hireDate: '2024-03-10',
    salary: 12000,
  },
  {
    name: '赵六',
    department: '财务部',
    position: '财务主管',
    hireDate: '2022-11-05',
    salary: 22000,
  },
  {
    name: '孙七',
    department: '研发部',
    position: '后端工程师',
    hireDate: '2024-05-01',
    salary: 16000,
  },
];

const sampleFields: ExportField[] = [
  { key: 'name', title: '姓名', width: 12 },
  { key: 'department', title: '部门', width: 15 },
  { key: 'position', title: '职位', width: 15 },
  { key: 'hireDate', title: '入职日期', width: 15 },
  { key: 'salary', title: '薪资', width: 12 },
];

const meta = {
  title: 'Common/DataExport',
  component: DataExport,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '数据导出组件，支持导出 Excel、CSV、PDF 格式，可选择导出字段。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    buttonText: {
      description: '按钮文本',
      control: 'text',
    },
    defaultFileName: {
      description: '默认文件名',
      control: 'text',
    },
    showFieldSelection: {
      description: '是否显示字段选择',
      control: 'boolean',
    },
    showFormatSelection: {
      description: '是否显示格式选择',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof DataExport>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: sampleData,
    fields: sampleFields,
  },
};

export const CustomFileName: Story = {
  args: {
    data: sampleData,
    fields: sampleFields,
    defaultFileName: '员工列表',
    buttonText: '导出员工数据',
  },
};

export const ExcelOnly: Story = {
  args: {
    data: sampleData,
    fields: sampleFields,
    showFormatSelection: false,
  },
};

export const NoFieldSelection: Story = {
  args: {
    data: sampleData,
    fields: sampleFields,
    showFieldSelection: false,
  },
};

export const Disabled: Story = {
  args: {
    data: [],
    fields: sampleFields,
    disabled: true,
  },
};

export const LargeDataset: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      name: `员工${i + 1}`,
      department: ['研发部', '市场部', '财务部'][i % 3],
      position: ['工程师', '经理', '专员'][i % 3],
      hireDate: '2024-01-01',
      salary: 10000 + i * 100,
    })),
    fields: sampleFields,
    defaultFileName: '大数据量导出',
  },
};
