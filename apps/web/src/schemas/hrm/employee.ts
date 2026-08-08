import type { EntitySchema } from '@/schema';
import { departmentApi } from '@/api/hrm';

const STATUS_OPTIONS = [
  { value: 'active', label: '在职' },
  { value: 'inactive', label: '离职' },
  { value: 'leave', label: '请假' },
];

const STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  inactive: 'default',
  leave: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: '在职',
  inactive: '离职',
  leave: '请假',
};

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
];

const EDUCATION_OPTIONS = [
  { value: 'high_school', label: '高中' },
  { value: 'college', label: '大专' },
  { value: 'bachelor', label: '本科' },
  { value: 'master', label: '硕士' },
  { value: 'doctor', label: '博士' },
];

const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'full_time', label: '全职' },
  { value: 'part_time', label: '兼职' },
  { value: 'contractor', label: '合同工' },
  { value: 'intern', label: '实习生' },
];

export const employeeSchema: EntitySchema = {
  entity: 'hrm_employee',
  title: '员工管理',
  description: '管理员工基础信息，包括工号、姓名、部门、职位、联系方式等',

  api: {
    module: 'hrm',
    resource: 'employees',
  },

  fields: [
    {
      name: 'employee_no',
      label: '工号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: '姓名',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'gender',
      label: '性别',
      type: 'select',
      defaultValue: 'male',
      listWidth: 80,
      options: {
        type: 'static',
        options: GENDER_OPTIONS,
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'department_id',
      label: '部门',
      type: 'select',
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'departments',
      },
      renderCell: (row: Record<string, unknown>) => {
        return (row.department_name as string) || (row.department_id as string) || '-';
      },
    },
    {
      name: 'position',
      label: '职位',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'joblevel',
      label: '职级',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'phone',
      label: '电话',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'hire_date',
      label: '入职日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'employee_type',
      label: '员工类型',
      type: 'select',
      defaultValue: 'full_time',
      listWidth: 100,
      options: {
        type: 'static',
        options: EMPLOYEE_TYPE_OPTIONS,
      },
    },
    {
      name: 'education',
      label: '学历',
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: EDUCATION_OPTIONS,
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: STATUS_OPTIONS,
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
  ],

  list: {
    columns: [
      'employee_no',
      'name',
      'department_id',
      'position',
      'email',
      'phone',
      'hire_date',
      'status',
    ],
    searchFields: ['employee_no', 'name', 'email'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['employee_no', 'name', 'gender', 'department_id', 'position', 'joblevel'],
    },
    {
      title: '联系方式',
      fields: ['email', 'phone', 'hire_date', 'employee_type', 'education'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增员工',
  editTitle: '编辑员工',
  detailTitle: '员工详情',

  dynamicOptions: [
    {
      field: 'department_id',
      queryKey: ['hrm', 'departments'],
      loader: async () => {
        const res = await departmentApi.list({ pagesize: 100 });
        if (res.success && res.data) {
          return (res.data.items || []).map((d: { id: string; name: string }) => ({
            value: d.id,
            label: d.name,
          }));
        }
        return [];
      },
    },
  ],
};

export {
  STATUS_OPTIONS,
  STATUS_COLOR_MAP,
  STATUS_LABEL_MAP,
  GENDER_OPTIONS,
  EDUCATION_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
};
