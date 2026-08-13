import type { Meta, StoryObj } from '@storybook/react-vite';
import CrudPage, { type CrudApiAdapter } from './CrudPage';
import type { EntitySchema } from '@/schema';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  status: 'active' | 'leave' | 'resigned';
  joinDate: string;
  email: string;
  salary: number;
}

const mockEmployees: Employee[] = [
  { id: '1', name: '张三', department: '研发部', position: '高级工程师', status: 'active', joinDate: '2022-03-15', email: 'zhangsan@topems.com', salary: 25000 },
  { id: '2', name: '李四', department: '市场部', position: '市场经理', status: 'active', joinDate: '2021-08-20', email: 'lisi@topems.com', salary: 22000 },
  { id: '3', name: '王五', department: '销售部', position: '销售总监', status: 'active', joinDate: '2020-06-10', email: 'wangwu@topems.com', salary: 35000 },
  { id: '4', name: '赵六', department: '财务部', position: '财务主管', status: 'leave', joinDate: '2019-11-05', email: 'zhaoliu@topems.com', salary: 20000 },
  { id: '5', name: '钱七', department: '研发部', position: '前端工程师', status: 'active', joinDate: '2023-01-18', email: 'qianqi@topems.com', salary: 18000 },
  { id: '6', name: '孙八', department: '人力资源', position: 'HR 专员', status: 'active', joinDate: '2022-09-01', email: 'sunba@topems.com', salary: 15000 },
  { id: '7', name: '周九', department: '运营部', position: '运营经理', status: 'resigned', joinDate: '2021-04-22', email: 'zhoujiu@topems.com', salary: 20000 },
  { id: '8', name: '吴十', department: '研发部', position: '后端工程师', status: 'active', joinDate: '2023-05-10', email: 'wushi@topems.com', salary: 20000 },
];

let employeeStore = [...mockEmployees];
let nextId = 100;

const employeeApi: CrudApiAdapter<Employee> = {
  list: async (params) => {
    await new Promise((r) => setTimeout(r, 300));
    const page = params?.page ?? 0;
    const pageSize = params?.pageSize ?? 10;
    const search = (params?.search as string) || '';
    const filtered = employeeStore.filter(
      (e) => !search || e.name.includes(search) || e.department.includes(search),
    );
    return {
      data: filtered.slice(page * pageSize, (page + 1) * pageSize),
      total: filtered.length,
    };
  },
  create: async (data) => {
    await new Promise((r) => setTimeout(r, 300));
    const newEmp: Employee = {
      ...(data as Partial<Employee>),
      id: String(nextId++),
      status: (data.status as Employee['status']) ?? 'active',
      joinDate: (data.joinDate as string) ?? new Date().toISOString().slice(0, 10),
    } as Employee;
    employeeStore = [newEmp, ...employeeStore];
    return newEmp;
  },
  update: async (id, data) => {
    await new Promise((r) => setTimeout(r, 300));
    employeeStore = employeeStore.map((e) => (e.id === id ? { ...e, ...data } : e));
    return employeeStore.find((e) => e.id === id)!;
  },
  delete: async (id) => {
    await new Promise((r) => setTimeout(r, 300));
    employeeStore = employeeStore.filter((e) => e.id !== id);
  },
};

const employeeSchema: EntitySchema<Employee> = {
  entity: 'employee',
  title: '员工',
  description: '公司员工信息管理',
  fields: [
    { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名' },
    { name: 'department', label: '部门', type: 'select', required: true, options: ['研发部', '市场部', '销售部', '财务部', '人力资源', '运营部'] },
    { name: 'position', label: '职位', type: 'text', required: true },
    { name: 'status', label: '状态', type: 'select', required: true, defaultValue: 'active', options: [{ value: 'active', label: '在职' }, { value: 'leave', label: '休假' }, { value: 'resigned', label: '离职' }] },
    { name: 'email', label: '邮箱', type: 'text', required: true },
    { name: 'salary', label: '薪资', type: 'number', required: false, placeholder: '月薪（元）' },
    { name: 'joinDate', label: '入职日期', type: 'date', required: true },
  ],
  actions: ['create', 'edit', 'detail', 'delete'],
  createTitle: '新建员工',
  editTitle: '编辑员工',
  detailTitle: '员工详情',
};

const meta = {
  title: 'Templates/CrudPage',
  component: CrudPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Schema 驱动的完整 CRUD 页面模板。一个 EntitySchema + API 适配器 = 列表 + 创建 + 编辑 + 详情 + 删除 + 批量操作。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CrudPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: employeeSchema,
    apiAdapter: employeeApi,
    idField: 'id',
  },
};

export const ReadOnly: Story = {
  args: {
    schema: { ...employeeSchema, readonly: true },
    apiAdapter: employeeApi,
    idField: 'id',
  },
};

export const LimitedActions: Story = {
  args: {
    schema: employeeSchema,
    apiAdapter: employeeApi,
    idField: 'id',
    actions: ['create', 'edit'],
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    schema: employeeSchema,
    apiAdapter: employeeApi,
    idField: 'id',
    breadcrumbs: [
      { label: '首页', href: '#' },
      { label: '人事管理' },
      { label: '员工列表' },
    ],
  },
};
