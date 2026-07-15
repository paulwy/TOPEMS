import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { ColumnDef } from '@tanstack/react-table';
import { Chip, Typography, Box } from '@mui/material';
import { DataTable } from './DataTable';

// ============ Sample Data ============

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  amount: number;
}

const sampleUsers: User[] = [
  {
    id: '1',
    name: '张明',
    email: 'zhangming@topems.com',
    department: '工程部',
    role: '高级工程师',
    status: 'active',
    joinDate: '2023-03-15',
    amount: 28000,
  },
  {
    id: '2',
    name: '李芳',
    email: 'lifang@topems.com',
    department: '产品部',
    role: '产品经理',
    status: 'active',
    joinDate: '2022-08-01',
    amount: 32000,
  },
  {
    id: '3',
    name: '王磊',
    email: 'wanglei@topems.com',
    department: '设计部',
    role: 'UI设计师',
    status: 'pending',
    joinDate: '2024-01-10',
    amount: 22000,
  },
  {
    id: '4',
    name: '赵婷',
    email: 'zhaoting@topems.com',
    department: '市场部',
    role: '市场总监',
    status: 'active',
    joinDate: '2021-06-20',
    amount: 38000,
  },
  {
    id: '5',
    name: '陈伟',
    email: 'chenwei@topems.com',
    department: '工程部',
    role: '前端工程师',
    status: 'inactive',
    joinDate: '2023-09-05',
    amount: 25000,
  },
  {
    id: '6',
    name: '刘洋',
    email: 'liuyang@topems.com',
    department: '财务部',
    role: '财务主管',
    status: 'active',
    joinDate: '2020-11-12',
    amount: 30000,
  },
  {
    id: '7',
    name: '孙雪',
    email: 'sunxue@topems.com',
    department: '人事部',
    role: 'HR经理',
    status: 'active',
    joinDate: '2022-04-18',
    amount: 26000,
  },
  {
    id: '8',
    name: '周杰',
    email: 'zhoujie@topems.com',
    department: '工程部',
    role: '后端工程师',
    status: 'active',
    joinDate: '2023-07-22',
    amount: 27000,
  },
  {
    id: '9',
    name: '吴静',
    email: 'wujing@topems.com',
    department: '运营部',
    role: '运营专员',
    status: 'pending',
    joinDate: '2024-02-28',
    amount: 18000,
  },
  {
    id: '10',
    name: '郑凯',
    email: 'zhengkai@topems.com',
    department: '产品部',
    role: '产品助理',
    status: 'active',
    joinDate: '2023-11-03',
    amount: 15000,
  },
  {
    id: '11',
    name: '黄丽',
    email: 'huangli@topems.com',
    department: '设计部',
    role: '交互设计师',
    status: 'active',
    joinDate: '2022-12-15',
    amount: 24000,
  },
  {
    id: '12',
    name: '林强',
    email: 'linqiang@topems.com',
    department: '市场部',
    role: '品牌经理',
    status: 'inactive',
    joinDate: '2021-03-08',
    amount: 29000,
  },
  {
    id: '13',
    name: '何敏',
    email: 'hemin@topems.com',
    department: '工程部',
    role: '测试工程师',
    status: 'active',
    joinDate: '2023-05-20',
    amount: 21000,
  },
  {
    id: '14',
    name: '罗浩',
    email: 'luohao@topems.com',
    department: '运营部',
    role: '数据分析师',
    status: 'active',
    joinDate: '2024-01-15',
    amount: 23000,
  },
  {
    id: '15',
    name: '谢文',
    email: 'xiewen@topems.com',
    department: '财务部',
    role: '会计',
    status: 'pending',
    joinDate: '2024-03-01',
    amount: 16000,
  },
];

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: '姓名',
    cell: (info) => (
      <Typography
        variant='body2'
        fontWeight={500}
      >
        {info.getValue<string>()}
      </Typography>
    ),
  },
  {
    accessorKey: 'email',
    header: '邮箱',
  },
  {
    accessorKey: 'department',
    header: '部门',
  },
  {
    accessorKey: 'role',
    header: '职位',
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: (info) => {
      const statusMap: Record<string, { label: string; color: 'success' | 'default' | 'warning' }> =
        {
          active: { label: '在职', color: 'success' },
          inactive: { label: '离职', color: 'default' },
          pending: { label: '待入职', color: 'warning' },
        };
      const s = statusMap[info.getValue<string>()] || statusMap.active;
      return (
        <Chip
          label={s.label}
          color={s.color}
          size='small'
        />
      );
    },
  },
  {
    accessorKey: 'joinDate',
    header: '入职日期',
  },
  {
    accessorKey: 'amount',
    header: '月薪 (CNY)',
    cell: (info) => `¥${info.getValue<number>().toLocaleString()}`,
  },
];

const sortableColumns: ColumnDef<User>[] = columns.map((col) => ({
  ...col,
  enableSorting: true,
}));

// ============ Meta ============

const meta = {
  title: 'Common/DataTable',
  component: DataTable,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '功能丰富的数据表格组件，支持搜索、排序、分页、行选择、行展开、高级筛选、数据导出等功能。基于 TanStack React Table 构建。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    searchKey: { description: '搜索字段名', control: 'text' },
    showSearch: { description: '是否显示搜索框', control: 'boolean' },
    showExport: { description: '是否显示导出按钮', control: 'boolean' },
    showSelection: { description: '是否显示选择框', control: 'boolean' },
    showCreate: { description: '是否显示新建按钮', control: 'boolean' },
    enablePagination: { description: '是否启用分页', control: 'boolean' },
    loading: { description: '加载状态', control: 'boolean' },
    compact: { description: '紧凑模式', control: 'boolean' },
    striped: { description: '斑马纹', control: 'boolean' },
    enableRowExpansion: { description: '启用行展开', control: 'boolean' },
    showRowNumber: { description: '显示行号', control: 'boolean' },
    enableAdvancedFilter: { description: '启用高级筛选', control: 'boolean' },
  },
  args: {
    onRowClick: fn(),
    onCreate: fn(),
    onSelectionChange: fn(),
    onRefresh: fn(),
    onPageChange: fn(),
    onPageSizeChange: fn(),
  },
} satisfies Meta<typeof DataTable<User, any>>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============ Stories ============

export const Default: Story = {
  args: {
    columns,
    data: sampleUsers,
    searchKey: 'name',
    searchPlaceholder: '搜索员工姓名...',
    showSearch: true,
    showExport: false,
    enablePagination: true,
    pageSize: 10,
    striped: true,
  },
};

export const WithSorting: Story = {
  args: {
    columns: sortableColumns,
    data: sampleUsers,
    searchKey: 'name',
    showSearch: true,
    showExport: false,
    enablePagination: true,
    pageSize: 10,
    striped: true,
  },
};

export const WithPagination: Story = {
  args: {
    columns,
    data: sampleUsers.slice(0, 10),
    searchKey: 'name',
    showSearch: false,
    showExport: false,
    enablePagination: true,
    pageSize: 5,
    totalItems: 156,
    totalPages: 16,
    onPageChange: fn(),
    onPageSizeChange: fn(),
    striped: true,
  },
};

export const WithSelection: Story = {
  args: {
    columns,
    data: sampleUsers,
    searchKey: 'name',
    showSearch: false,
    showExport: false,
    showSelection: true,
    enablePagination: true,
    pageSize: 10,
    onSelectionChange: fn(),
    striped: true,
  },
};

export const WithExpansion: Story = {
  args: {
    columns,
    data: sampleUsers.slice(0, 5),
    searchKey: 'name',
    showSearch: false,
    showExport: false,
    enableRowExpansion: true,
    enablePagination: false,
    striped: true,
    expandedRowRender: (row: User) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='body2'>
          <strong>邮箱：</strong>
          {row.email}
        </Typography>
        <Typography variant='body2'>
          <strong>部门：</strong>
          {row.department} | <strong>职位：</strong>
          {row.role}
        </Typography>
        <Typography variant='body2'>
          <strong>入职日期：</strong>
          {row.joinDate} | <strong>月薪：</strong>¥{row.amount.toLocaleString()}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          这是一条展开的详细信息行，可以显示该行的更多上下文数据。
        </Typography>
      </Box>
    ),
  },
};

export const WithFiltering: Story = {
  args: {
    columns,
    data: sampleUsers,
    searchKey: 'name',
    searchPlaceholder: '搜索姓名或邮箱...',
    showSearch: true,
    showExport: false,
    enableAdvancedFilter: true,
    advancedFilters: [
      {
        label: '部门',
        key: 'department',
        type: 'select',
        options: [
          { value: '工程部', label: '工程部' },
          { value: '产品部', label: '产品部' },
          { value: '设计部', label: '设计部' },
          { value: '市场部', label: '市场部' },
          { value: '财务部', label: '财务部' },
          { value: '人事部', label: '人事部' },
          { value: '运营部', label: '运营部' },
        ],
        value: '',
        onChange: fn(),
      },
      {
        label: '状态',
        key: 'status',
        type: 'select',
        options: [
          { value: 'active', label: '在职' },
          { value: 'inactive', label: '离职' },
          { value: 'pending', label: '待入职' },
        ],
        value: '',
        onChange: fn(),
      },
      {
        label: '入职日期（起始）',
        key: 'joinDateFrom',
        type: 'date',
        value: '',
        onChange: fn(),
      },
    ],
    enablePagination: true,
    pageSize: 10,
    striped: true,
  },
};

export const Compact: Story = {
  args: {
    columns,
    data: sampleUsers,
    searchKey: 'name',
    showSearch: true,
    showExport: false,
    compact: true,
    striped: false,
    enablePagination: true,
    pageSize: 10,
  },
};

export const Loading: Story = {
  args: {
    columns,
    data: [],
    searchKey: 'name',
    showSearch: true,
    showExport: false,
    loading: true,
    enablePagination: true,
    pageSize: 10,
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    searchKey: 'name',
    showSearch: true,
    showExport: false,
    enablePagination: false,
    emptyMessage: '暂无匹配的员工记录，请尝试调整搜索条件。',
  },
};
