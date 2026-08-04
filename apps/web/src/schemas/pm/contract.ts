import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'primary',
  active: 'success',
  completed: 'primary',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  active: '执行中',
  completed: '已完成',
  cancelled: '已取消',
};

const CONTRACT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'construction', label: '工程合同' },
  { value: 'service', label: '服务合同' },
  { value: 'purchase', label: '采购合同' },
  { value: 'sales', label: '销售合同' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'active', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
});

export const contractSchema: EntitySchema = {
  entity: 'pm_contract',
  title: '合同管理',
  description: '管理项目相关的合同，跟踪合同执行状态',

  api: {
    module: 'pm',
    resource: 'contracts',
  },

  fields: [
    {
      name: 'contract_name',
      label: '合同名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'contractNo',
      label: '合同编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'contract_type',
      label: '类型',
      type: 'select',
      required: true,
      options: { type: 'static', options: CONTRACT_TYPE_OPTIONS },
      listWidth: 100,
    },
    {
      name: 'party_a',
      label: '甲方',
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'party_b',
      label: '乙方',
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.amount as number | undefined;
        if (!amount) return '-';
        return CURRENCY_FORMATTER.format(amount);
      },
    },
    {
      name: 'currency',
      label: '币种',
      type: 'text',
      defaultValue: 'CNY',
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'sign_date',
      label: '签署日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'end_date',
      label: '到期日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'contract_name',
      'contractNo',
      'contract_type',
      'party_b',
      'amount',
      'status',
      'sign_date',
      'end_date',
    ],
    searchFields: ['contract_name', 'contractNo'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'contract_type',
        label: '类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...CONTRACT_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['contract_name', 'contractNo', 'contract_type', 'status'],
    },
    {
      title: '合同方',
      fields: ['party_a', 'party_b'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'currency', 'sign_date', 'start_date', 'end_date'],
    },
  ],

  formColCount: 2,
  createTitle: '创建合同',
  editTitle: '编辑合同',
  detailTitle: '合同详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
