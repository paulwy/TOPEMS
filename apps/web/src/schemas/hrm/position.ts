import type { EntitySchema } from '@/schema';
import { departmentApi, type Department } from '@/api/hrm';

async function loadDepartmentOptions(): Promise<{ value: string; label: string }[]> {
  try {
    const response = await departmentApi.list();
    if (response.code === 200 && response.data) {
      const items = response.data.items || [];
      return items.map((d: Department) => ({ value: d.id, label: d.name }));
    }
  } catch {
    // ignore
  }
  return [];
}

export const positionSchema: EntitySchema = {
  entity: 'hrm_position',
  title: '岗位管理',
  description: '管理企业岗位信息，包括岗位名称、编码、部门、级别、薪资范围、状态等',

  api: {
    module: 'hrm',
    resource: 'positions',
  },

  fields: [
    {
      name: 'name',
      label: '岗位名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: '岗位编码',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'select',
      listWidth: 140,
    },
    {
      name: 'level',
      label: '岗位级别',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'min_salary',
      label: '最低薪资',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'max_salary',
      label: '最高薪资',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'employee_count',
      label: '在岗人数',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '岗位描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'requirements',
      label: '任职要求',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'name',
      'code',
      'department_id',
      'level',
      'min_salary',
      'max_salary',
      'employee_count',
      'status',
    ],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: '启用',
        inactive: '停用',
      },
    },
    filters: [
      {
        id: 'department_id',
        label: '所属部门',
        type: 'select',
        paramName: 'department_id',
        options: [{ label: '全部部门', value: 'all' }],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
        ],
      },
    ],
  },

  dynamicOptions: [
    {
      field: 'department_id',
      loader: loadDepartmentOptions,
      queryKey: ['hrm', 'departments'],
    },
  ],

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'department_id', 'level', 'status'],
    },
    {
      title: '薪资范围',
      fields: ['min_salary', 'max_salary'],
    },
    {
      title: '详细描述',
      fields: ['description', 'requirements'],
    },
  ],

  formColCount: 2,
  createTitle: '新增岗位',
  editTitle: '编辑岗位',
  detailTitle: '岗位详情',
};
