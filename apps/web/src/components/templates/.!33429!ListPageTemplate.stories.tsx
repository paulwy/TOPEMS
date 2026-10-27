import type { Meta, StoryObj } from '@storybook/react-vite';
import { iconSm } from '../sharedStyles';
import { Chip } from '@mui/material';
import { Edit2, Trash2, Eye } from 'lucide-react';

import { ListPageTemplate } from './ListPageTemplate';

const meta = {
  title: 'Templates/ListPageTemplate',
  component: ListPageTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '列表页模板，提供完整的列表页面布局，包括搜索、筛选、排序、分页、行操作、批量操作等功能。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ListPageTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  status: string;
  joinDate: string;
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: '张三',
    department: '研发部',
    position: '高级工程师',
    status: '在职',
    joinDate: '2022-03-15',
  },
  {
    id: '2',
    name: '李四',
    department: '市场部',
    position: '市场经理',
    status: '在职',
    joinDate: '2021-08-20',
  },
  {
    id: '3',
    name: '王五',
    department: '销售部',
    position: '销售总监',
    status: '在职',
    joinDate: '2020-06-10',
  },
  {
    id: '4',
    name: '赵六',
    department: '财务部',
    position: '财务主管',
    status: '休假',
    joinDate: '2019-11-05',
  },
  {
    id: '5',
    name: '钱七',
    department: '研发部',
    position: '前端工程师',
    status: '在职',
    joinDate: '2023-01-18',
  },
  {
    id: '6',
    name: '孙八',
    department: '人力资源',
    position: 'HR 专员',
    status: '在职',
    joinDate: '2022-09-01',
  },
  {
    id: '7',
    name: '周九',
    department: '运营部',
    position: '运营经理',
    status: '离职',
    joinDate: '2021-04-22',
  },
  {
    id: '8',
    name: '吴十',
    department: '研发部',
    position: '后端工程师',
    status: '在职',
    joinDate: '2023-05-10',
  },
  {
    id: '9',
    name: '郑十一',
    department: '市场部',
    position: '品牌策划',
    status: '在职',
    joinDate: '2022-12-03',
  },
  {
    id: '10',
    name: '冯十二',
    department: '销售部',
    position: '客户经理',
    status: '在职',
    joinDate: '2021-07-28',
  },
  {
    id: '11',
    name: '陈十三',
    department: '财务部',
    position: '会计',
    status: '在职',
    joinDate: '2023-02-14',
  },
  {
    id: '12',
    name: '卫十四',
    department: '研发部',
    position: '测试工程师',
    status: '在职',
    joinDate: '2022-10-20',
  },
];

const columns = [
  {
    id: 'name',
    label: '姓名',
    sortable: true,
    width: 120,
  },
  {
    id: 'department',
    label: '部门',
    sortable: true,
    width: 120,
  },
  {
    id: 'position',
    label: '职位',
    width: 150,
  },
  {
    id: 'status',
    label: '状态',
    width: 100,
    render: (row: Employee) => (
      <Chip
        label={row.status}
        size='small'
        color={row.status === '在职' ? 'success' : row.status === '休假' ? 'warning' : 'default'}
        sx={{ height: 24 }}
      />
    ),
  },
  {
    id: 'joinDate',
    label: '入职日期',
    sortable: true,
    width: 130,
  },
];

export const Default: Story = {
  args: {
    title: '员工管理',
    subtitle: '共 128 名员工',
    columns,
    data: mockEmployees.slice(0, 8),
    searchable: true,
    searchPlaceholder: '搜索姓名、部门...',
    selectable: true,
    sortable: true,
    rowActions: [
      {
        label: '查看',
        icon: <Eye style={iconSm} />,
        onClick: () => {},
      },
      {
        label: '编辑',
        icon: <Edit2 style={iconSm} />,
        onClick: () => {},
      },
      {
        label: '删除',
        icon: <Trash2 style={iconSm} />,
        color: 'error',
        onClick: () => {},
        divider: true,
      },
    ],
    pagination: {
      page: 0,
      pageSize: 10,
      total: 128,
      onPageChange: () => {},
    },
  },
};

const WithRowNumbers: Story = {
  args: {
    title: '生产工单列表',
    columns: [
      { id: 'orderNo', label: '工单号', sortable: true, width: 140 },
      { id: 'product', label: '产品名称', width: 160 },
      { id: 'quantity', label: '数量', align: 'right', width: 80 },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row: Record<string, unknown>) => (
          <Chip
            label={String(row.status)}
            size='small'
            color={
