import type { EntitySchema } from '@/schema';

export const safetyIssueSchema: EntitySchema = {
  entity: 'ehsSafetyIssue',
  title: '隐患管理',
  description: '管理企业安全隐患信息，包括隐患等级、类别、来源、状态及整改流程',

  api: {
    module: 'ehs',
    resource: 'safetyIssues',
  },

  fields: [
    {
      name: 'hazard_no',
      label: '隐患编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      showInForm: false,
    },
    {
      name: 'title',
      label: '隐患名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'category',
      label: '隐患类别',
      type: 'select',
      required: true,
      defaultValue: 'equipment',
      options: {
        type: 'static',
        options: [
          { value: 'equipment', label: '设备隐患' },
          { value: 'environment', label: '环境隐患' },
          { value: 'behavior', label: '行为隐患' },
          { value: 'management', label: '管理隐患' },
          { value: 'fire', label: '消防隐患' },
          { value: 'electrical', label: '电气隐患' },
          { value: 'chemical', label: '化学品隐患' },
          { value: 'structural', label: '结构隐患' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.category as string;
        const map: Record<string, string> = {
          equipment: '设备隐患',
          environment: '环境隐患',
          behavior: '行为隐患',
          management: '管理隐患',
          fire: '消防隐患',
          electrical: '电气隐患',
          chemical: '化学品隐患',
          structural: '结构隐患',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'level',
      label: '隐患等级',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: {
        type: 'static',
        options: [
          { value: 'major', label: '重大隐患' },
          { value: 'serious', label: '严重隐患' },
          { value: 'general', label: '一般隐患' },
          { value: 'minor', label: '轻微隐患' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.level as string;
        const map: Record<string, string> = {
          major: '重大隐患',
          serious: '严重隐患',
          general: '一般隐患',
          minor: '轻微隐患',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'source',
      label: '来源',
      type: 'select',
      required: true,
      defaultValue: 'inspection',
      options: {
        type: 'static',
        options: [
          { value: 'inspection', label: '检查发现' },
          { value: 'reporting', label: '员工上报' },
          { value: 'audit', label: '审计发现' },
          { value: 'accident', label: '事故排查' },
          { value: 'monitoring', label: '监测预警' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.source as string;
        const map: Record<string, string> = {
          inspection: '检查发现',
          reporting: '员工上报',
          audit: '审计发现',
          accident: '事故排查',
          monitoring: '监测预警',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'location',
      label: '位置',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'reported_by',
      label: '上报人',
      type: 'text',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.reported_by as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'reported_at',
      label: '上报时间',
      type: 'datetime',
      listWidth: 160,
      showInForm: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.reported_at as string | null | undefined;
        return v ? new Date(v).toLocaleString('zh-CN') : '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'reported',
      options: {
        type: 'static',
        options: [
          { value: 'reported', label: '已上报' },
          { value: 'rectifying', label: '整改中' },
          { value: 'pending_verification', label: '待验收' },
          { value: 'verified', label: '已验收' },
          { value: 'closed', label: '已闭环' },
          { value: 'rejected', label: '已驳回' },
        ],
      },
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'description',
      label: '隐患描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: [
      'hazard_no',
      'title',
      'level',
      'category',
      'location',
      'source',
      'reported_by',
      'status',
    ],
    searchFields: ['title', 'hazard_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        reported: 'error',
        rectifying: 'warning',
        pending_verification: 'info',
        verified: 'success',
        closed: 'default',
        rejected: 'error',
      },
      labelMap: {
        reported: '已上报',
        rectifying: '整改中',
        pending_verification: '待验收',
        verified: '已验收',
        closed: '已闭环',
        rejected: '已驳回',
      },
    },
    filters: [
      {
        id: 'level',
        label: '隐患等级',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '重大隐患', value: 'major' },
          { label: '严重隐患', value: 'serious' },
          { label: '一般隐患', value: 'general' },
          { label: '轻微隐患', value: 'minor' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '已上报', value: 'reported' },
          { label: '整改中', value: 'rectifying' },
          { label: '待验收', value: 'pending_verification' },
          { label: '已验收', value: 'verified' },
          { label: '已闭环', value: 'closed' },
          { label: '已驳回', value: 'rejected' },
        ],
      },
    ],
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['title', 'category', 'level'],
    },
    {
      title: '来源与位置',
      fields: ['source', 'location', 'reported_by'],
    },
    {
      title: '隐患描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '上报隐患',
  editTitle: '编辑隐患',
  detailTitle: '隐患详情',
};
