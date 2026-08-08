import type { EntitySchema } from '@/schema';

export const trainingRecordSchema: EntitySchema = {
  entity: 'ehsTrainingRecord',
  title: '培训记录',
  description: '管理企业培训记录信息，包括培训类型、讲师、时间、时长、状态等',

  api: {
    module: 'ehs',
    resource: 'trainingRecords',
  },

  fields: [
    {
      name: 'record_no',
      label: '记录编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '培训名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'training_type',
      label: '培训类型',
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: '安全培训' },
          { value: 'professional', label: '专业培训' },
          { value: 'skill', label: '技能培训' },
          { value: 'awareness', label: '意识培训' },
          { value: 'emergency', label: '应急培训' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.training_type as string;
        const map: Record<string, string> = {
          safety: '安全培训',
          professional: '专业培训',
          skill: '技能培训',
          awareness: '意识培训',
          emergency: '应急培训',
        };
        return map[v] || v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'trainer',
      label: '讲师',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.trainer as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'training_date',
      label: '培训日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.training_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: '时长(小时)',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.duration_hours as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'ongoing',
      options: {
        type: 'static',
        options: [
          { value: 'ongoing', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'failed', label: '未通过' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'content',
      label: '培训内容',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'result',
      label: '培训结果',
      type: 'text',
      showInList: false,
    },
    {
      name: 'pass_rate',
      label: '通过率(%)',
      type: 'number',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'record_no',
      'title',
      'training_type',
      'trainer',
      'training_date',
      'duration_hours',
      'status',
    ],
    searchFields: ['record_no', 'title', 'trainer'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        ongoing: 'warning',
        completed: 'success',
        failed: 'error',
      },
      labelMap: {
        ongoing: '进行中',
        completed: '已完成',
        failed: '未通过',
      },
    },
    filters: [
      {
        id: 'training_type',
        label: '培训类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '安全培训', value: 'safety' },
          { label: '专业培训', value: 'professional' },
          { label: '技能培训', value: 'skill' },
          { label: '意识培训', value: 'awareness' },
          { label: '应急培训', value: 'emergency' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '进行中', value: 'ongoing' },
          { label: '已完成', value: 'completed' },
          { label: '未通过', value: 'failed' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['record_no', 'title', 'training_type', 'status'],
    },
    {
      title: '培训详情',
      fields: ['trainer', 'training_date', 'duration_hours'],
    },
    {
      title: '结果与内容',
      fields: ['content', 'result', 'pass_rate'],
    },
  ],

  formColCount: 2,
  detailTitle: '培训记录详情',
};

export const trainingCertificateSchema: EntitySchema = {
  entity: 'ehsTrainingCertificate',
  title: '培训证书',
  description: '管理企业培训证书信息，包括证书类型、颁发日期、有效期、状态等',

  api: {
    module: 'ehs',
    resource: 'trainingCertificates',
  },

  fields: [
    {
      name: 'certificate_no',
      label: '证书编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'training_type',
      label: '培训类型',
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: '安全培训' },
          { value: 'professional', label: '专业培训' },
          { value: 'skill', label: '技能培训' },
          { value: 'awareness', label: '意识培训' },
          { value: 'emergency', label: '应急培训' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.training_type as string;
        const map: Record<string, string> = {
          safety: '安全培训',
          professional: '专业培训',
          skill: '技能培训',
          awareness: '意识培训',
          emergency: '应急培训',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'certificate_type',
      label: '证书类型',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'issue_date',
      label: '颁发日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.issue_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'expiry_date',
      label: '有效期至',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.expiry_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'issuing_authority',
      label: '颁发机构',
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'valid',
      options: {
        type: 'static',
        options: [
          { value: 'valid', label: '有效' },
          { value: 'expired', label: '已过期' },
          { value: 'revoked', label: '已吊销' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'certificate_no',
      'employee_name',
      'training_type',
      'certificate_type',
      'issue_date',
      'expiry_date',
      'status',
    ],
    searchFields: ['certificate_no', 'employee_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        valid: 'success',
        expired: 'warning',
        revoked: 'error',
      },
      labelMap: {
        valid: '有效',
        expired: '已过期',
        revoked: '已吊销',
      },
    },
    filters: [
      {
        id: 'training_type',
        label: '培训类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '安全培训', value: 'safety' },
          { label: '专业培训', value: 'professional' },
          { label: '技能培训', value: 'skill' },
          { label: '意识培训', value: 'awareness' },
          { label: '应急培训', value: 'emergency' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '有效', value: 'valid' },
          { label: '已过期', value: 'expired' },
          { label: '已吊销', value: 'revoked' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['certificate_no', 'employee_name', 'training_type', 'certificate_type'],
    },
    {
      title: '颁发信息',
      fields: ['issue_date', 'expiry_date', 'issuing_authority', 'status'],
    },
  ],

  formColCount: 2,
  detailTitle: '培训证书详情',
};

export const trainingPlanSchema: EntitySchema = {
  entity: 'ehsTrainingPlan',
  title: '培训计划',
  description: '管理企业培训计划信息，包括培训类型、类别、时间、讲师、状态等',

  api: {
    module: 'ehs',
    resource: 'trainingPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: '计划编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'title',
      label: '培训名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'training_type',
      label: '培训类型',
      type: 'select',
      required: true,
      defaultValue: 'safety',
      options: {
        type: 'static',
        options: [
          { value: 'safety', label: '安全培训' },
          { value: 'professional', label: '专业培训' },
          { value: 'skill', label: '技能培训' },
          { value: 'awareness', label: '意识培训' },
          { value: 'emergency', label: '应急培训' },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'category',
      label: '类别',
      type: 'select',
      required: true,
      defaultValue: 'mandatory',
      options: {
        type: 'static',
        options: [
          { value: 'mandatory', label: '必修' },
          { value: 'optional', label: '选修' },
          { value: 'onboarding', label: '入职培训' },
          { value: 'special', label: '专项培训' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'trainer',
      label: '讲师',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.trainer as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'location',
      label: '地点',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.start_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.end_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: '时长(小时)',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.duration_hours as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'max_participants',
      label: '最大人数',
      type: 'number',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.max_participants as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'ongoing', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['title', 'training_type', 'category', 'trainer', 'start_date', 'status'],
    searchFields: ['title', 'trainer'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        ongoing: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        published: '已发布',
        ongoing: '进行中',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'training_type',
        label: '培训类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '安全培训', value: 'safety' },
          { label: '专业培训', value: 'professional' },
          { label: '技能培训', value: 'skill' },
          { label: '意识培训', value: 'awareness' },
          { label: '应急培训', value: 'emergency' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已发布', value: 'published' },
          { label: '进行中', value: 'ongoing' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['title', 'training_type', 'category'],
    },
    {
      title: '培训详情',
      fields: ['trainer', 'location', 'duration_hours', 'max_participants'],
    },
    {
      title: '时间安排',
      fields: ['start_date', 'end_date'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建培训计划',
  editTitle: '编辑培训计划',
  detailTitle: '培训计划详情',
};
