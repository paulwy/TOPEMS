import type { EntitySchema } from '@/schema';

export const healthManagementSchema: EntitySchema = {
  entity: 'ehsHealthRecord',
  title: '健康档案',
  description: '管理员工职业健康档案信息，包括员工基本信息、健康状况、过敏史、既往病史等',

  api: {
    module: 'ehs',
    resource: 'healthRecords',
  },

  fields: [
    {
      name: 'record_no',
      label: '档案编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      hideInForm: true,
      visibleWhen: () => false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.record_no as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_id',
      label: '工号',
      type: 'text',
      required: true,
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'gender',
      label: '性别',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' },
        ],
      },
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'birthday',
      label: '出生日期',
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.birthday as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'department',
      label: '部门',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.department as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'position',
      label: '岗位',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.position as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'workplace',
      label: '工作场所',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.workplace as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'blood_type',
      label: '血型',
      type: 'text',
      listWidth: 80,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.blood_type as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'contact_info',
      label: '联系方式',
      type: 'text',
      listWidth: 140,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.contact_info as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'allergy_history',
      label: '过敏史',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'medical_history',
      label: '既往病史',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'hazard_factors',
      label: '危害因素',
      type: 'text',
      showInList: false,
      hideInForm: true,
      visibleWhen: () => false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hazard_factors;
        return Array.isArray(v) ? v.join(', ') : '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '正常' },
          { value: 'inactive', label: '无效' },
          { value: 'suspended', label: '暂停' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['record_no', 'employee_name', 'department', 'position', 'workplace', 'status'],
    searchFields: ['employee_name', 'record_no', 'employee_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        suspended: 'warning',
      },
      labelMap: {
        active: '正常',
        inactive: '无效',
        suspended: '暂停',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '正常', value: 'active' },
          { label: '无效', value: 'inactive' },
          { label: '暂停', value: 'suspended' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '员工基本信息',
      fields: ['employee_id', 'employee_name', 'gender', 'birthday'],
    },
    {
      title: '岗位信息',
      fields: ['department', 'position', 'workplace'],
    },
    {
      title: '健康信息',
      fields: ['blood_type', 'contact_info', 'allergy_history', 'medical_history'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增健康档案',
  editTitle: '编辑健康档案',
  detailTitle: '健康档案详情',
};
