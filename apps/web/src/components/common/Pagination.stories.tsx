import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import PaginationComponent from './Pagination';

const meta = {
  title: 'Common/Pagination',
  component: PaginationComponent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '分页组件，支持首页、末页、上一页、下一页、页码跳转和每页条数选择。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    page: {
      description: '当前页码',
      control: { type: 'number', min: 1 },
    },
    total: {
      description: '总页数',
      control: { type: 'number', min: 1 },
    },
    pageSize: {
      description: '每页条数',
      control: { type: 'select' },
      options: [10, 20, 50, 100],
    },
    showPageSize: {
      description: '是否显示每页条数选择',
      control: 'boolean',
    },
    showTotal: {
      description: '是否显示总条数',
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
    onPageSizeChange: fn(),
  },
} satisfies Meta<typeof PaginationComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

const Template = (args: unknown) => {
  const [page, setPage] = React.useState(args.page || 1);
  const [pageSize, setPageSize] = React.useState(args.pageSize || 10);

  return (
    <PaginationComponent
      {...args}
      page={page}
      pageSize={pageSize}
      onChange={setPage}
      onPageSizeChange={setPageSize}
      totalItems={args.totalItems || 100}
    />
  );
};

import React from 'react';

export const Default: Story = {
  render: (args) => (
    <Template
      {...args}
      page={1}
      total={10}
      totalItems={100}
    />
  ),
};

const ManyPages: Story = {
  render: (args) => (
    <Template
      {...args}
      page={5}
      total={50}
      totalItems={500}
    />
  ),
};

const FirstPage: Story = {
  render: (args) => (
    <Template
      {...args}
      page={1}
      total={10}
      totalItems={100}
    />
  ),
};

const LastPage: Story = {
  render: (args) => (
    <Template
      {...args}
      page={10}
      total={10}
      totalItems={100}
    />
  ),
};

const WithoutPageSizeSelector: Story = {
  render: (args) => (
    <Template
      {...args}
      page={3}
      total={10}
      totalItems={100}
      showPageSize={false}
    />
  ),
};

const WithoutTotal: Story = {
  render: (args) => (
    <Template
      {...args}
      page={3}
      total={10}
      showTotal={false}
    />
  ),
};

const SmallDataSet: Story = {
  render: (args) => (
    <Template
      {...args}
      page={1}
      total={3}
      totalItems={25}
    />
  ),
};
