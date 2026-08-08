import type { EntitySchema } from '@/schema';

export const occupationalDiseaseSchema: EntitySchema = {
  entity: 'ehsOccupationalDiseaseCase',
  title: '职业病管理',
  description: '管理企业职业病案例，包括员工信息、危害因素、诊断信息、严重程度、状态等',

  api: {
    module: 'ehs',
    resource: 'occupationalDiseases',
  },

  fields: [
    {
      name: 'case_no',
      label: '案例编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 150,
      showInForm: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.case_no as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'employee_id',
      label: '员工编号',
      type: 'text',
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'department',
      label: '部门',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.department as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'hazard_factor',
      label: '危害因素',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '粉尘', label: '粉尘' },
          { value: '化学', label: '化学' },
          { value: '物理', label: '物理' },
          { value: '生物', label: '生物' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.hazard_factor as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'diagnosis_date',
      label: '诊断日期',
      type: 'date',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.diagnosis_date as string | null | undefined;
        return v ? new Date(v).toLocaleDateString('zh-CN') : '-';
      },
    },
    {
      name: 'disease_name',
      label: '职业病名称',
      type: 'text',
      required: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.disease_name as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'disease_type',
      label: '疾病类型',
      type: 'text',
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'severity',
      label: '严重程度',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'mild', label: '轻度' },
          { value: 'moderate', label: '中度' },
          { value: 'severe', label: '重度' },
          { value: 'fatal', label: '极重度' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.severity as string;
        const map: Record<string, string> = {
          mild: '轻度',
          moderate: '中度',
          severe: '重度',
          fatal: '极重度',
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'suspected',
      options: {
        type: 'static',
        options: [
          { value: 'suspected', label: '疑似' },
          { value: 'confirmed', label: '确诊' },
          { value: 'recovered', label: '康复' },
          { value: 'chronic', label: '慢性' },
          { value: 'deceased', label: '死亡' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.status as string;
        const map: Record<string, string> = {
          suspected: '疑似',
          confirmed: '确诊',
          recovered: '康复',
          chronic: '慢性',
          deceased: '死亡',
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'diagnosis_hospital',
      label: '诊断医院',
      type: 'text',
      showInList: false,
    },
    {
      name: 'treatment',
      label: '治疗方案',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: [
      'case_no',
      'employee_name',
      'department',
      'hazard_factor',
      'diagnosis_date',
      'disease_name',
      'severity',
      'status',
    ],
    searchFields: ['case_no', 'employee_name', 'disease_name', 'department'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        suspected: 'warning',
        confirmed: 'error',
        recovered: 'success',
        chronic: 'info',
        deceased: 'default',
      },
      labelMap: {
        suspected: '疑似',
        confirmed: '确诊',
        recovered: '康复',
        chronic: '慢性',
        deceased: '死亡',
      },
    },
    filters: [
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '轻度', value: 'mild' },
          { label: '中度', value: 'moderate' },
          { label: '重度', value: 'severe' },
          { label: '极重度', value: 'fatal' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '疑似', value: 'suspected' },
          { label: '确诊', value: 'confirmed' },
          { label: '康复', value: 'recovered' },
          { label: '慢性', value: 'chronic' },
          { label: '死亡', value: 'deceased' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '员工信息',
      fields: ['employee_name', 'employee_id', 'department'],
    },
    {
      title: '诊断信息',
      fields: [
        'hazard_factor',
        'diagnosis_date',
        'disease_name',
        'disease_type',
        'diagnosis_hospital',
      ],
    },
    {
      title: '严重程度与状态',
      fields: ['severity', 'status'],
    },
    {
      title: '其他信息',
      fields: ['treatment', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增职业病案例',
  editTitle: '编辑职业病案例',
  detailTitle: '职业病案例详情',
};
