import type { EntitySchema } from '@/schema';
import { employeeApi } from '@/api/hrm';
import type { Employee } from '@/api/hrm/types';

async function loadEmployeeOptions(): Promise<{ value: string; label: string }[]> {
  try {
    const response = await employeeApi.list({ page: 1, pagesize: 100 });
    if (response.code === 0 && response.data) {
      const items = response.data.items || [];
      return items.map((e: Employee) => ({ value: e.id, label: e.name }));
    }
  } catch {
    // ignore
  }
  return [];
}

export const contractSchema: EntitySchema = {
  entity: 'hrm_contract',
  title: '合同管理',
  description: '管理员工合同信息，包括合同创建、到期提醒和续签流程',

  api: {
    module: 'hrm',
    resource: 'contracts',
  },

  fields: [
    {
      name: 'contract_no',
      label: '合同编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 128,
    },
    {
      name: 'employee_id',
      label: '员工',
      type: 'select',
      required: true,
      listWidth: 120,
    },
    {
      name: 'contract_type',
      label: '合同类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'labor', label: '劳动合同' },
          { value: 'probation', label: '试用期合同' },
          { value: 'part-time', label: '兼职合同' },
          { value: 'project', label: '项目合同' },
          { value: 'consulting', label: '咨询合同' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'party_a_name',
      label: '甲方名称',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'party_a_contact',
      label: '甲方联系方式',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'party_b_name',
      label: '乙方名称',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'party_b_contact',
      label: '乙方联系方式',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'salary',
      label: '薪资',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'probation_period_days',
      label: '试用期(天)',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'reminder_days',
      label: '到期提醒(天)',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '生效中' },
          { value: 'expired', label: '已到期' },
          { value: 'terminated', label: '已终止' },
          { value: 'pending', label: '待审批' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'contract_file_path',
      label: '合同附件',
      type: 'text',
      showInList: false,
    },
    {
      name: 'notes',
      label: '备注',
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
      'contract_no',
      'employee_id',
      'contract_type',
      'salary',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['contract_no'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        expired: 'error',
        terminated: 'default',
        pending: 'warning',
      },
      labelMap: {
        active: '生效中',
        expired: '已到期',
        terminated: '已终止',
        pending: '待审批',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '生效中', value: 'active' },
          { label: '已到期', value: 'expired' },
          { label: '已终止', value: 'terminated' },
          { label: '待审批', value: 'pending' },
        ],
      },
    ],
  },

  dynamicOptions: [
    {
      field: 'employee_id',
      loader: loadEmployeeOptions,
      queryKey: ['hrm', 'employees'],
    },
  ],

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['contract_no', 'employee_id', 'contract_type', 'status'],
    },
    {
      title: '甲方信息',
      fields: ['party_a_name', 'party_a_contact'],
    },
    {
      title: '乙方信息',
      fields: ['party_b_name', 'party_b_contact'],
    },
    {
      title: '合同期限与薪资',
      fields: ['start_date', 'end_date', 'salary', 'probation_period_days', 'reminder_days'],
    },
    {
      title: '其他信息',
      fields: ['contract_file_path', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增合同',
  editTitle: '编辑合同',
  detailTitle: '合同详情',
};
