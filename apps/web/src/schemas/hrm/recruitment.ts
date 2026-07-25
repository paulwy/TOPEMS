import type { EntitySchema } from '@/schema';

export const recruitmentSchema: EntitySchema = {
  entity: 'hrm_recruitment',
  title: '招聘管理',
  description: '管理招聘需求，包括职位、部门、人数、招聘负责人、状态等',

  api: {
    module: 'hrm',
    resource: 'jobOpenings',
  },

  fields: [
    {
      name: 'title',
      label: '职位名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: '职位编码',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'department_id',
      label: '部门',
      type: 'select',
      listWidth: 140,
    },
    {
      name: 'employment_type',
      label: '雇佣类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'full_time', label: '全职' },
          { value: 'part_time', label: '兼职' },
          { value: 'contract', label: '合同' },
          { value: 'intern', label: '实习' },
          { value: 'temporary', label: '临时' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'location',
      label: '工作地点',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'salary_min',
      label: '最低薪资',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'salary_max',
      label: '最高薪资',
      type: 'number',
      listWidth: 100,
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
          { value: 'in_progress', label: '招聘中' },
          { value: 'closed', label: '已关闭' },
          { value: 'filled', label: '已招满' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'publish_date',
      label: '发布日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'close_date',
      label: '截止日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: '职位描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'requirements',
      label: '任职要求',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'title',
      'code',
      'department_id',
      'employment_type',
      'location',
      'salary_min',
      'salary_max',
      'status',
    ],
    searchFields: ['title', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        in_progress: 'success',
        closed: 'default',
        filled: 'success',
      },
      labelMap: {
        draft: '草稿',
        published: '已发布',
        in_progress: '招聘中',
        closed: '已关闭',
        filled: '已招满',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已发布', value: 'published' },
          { label: '招聘中', value: 'in_progress' },
          { label: '已关闭', value: 'closed' },
          { label: '已招满', value: 'filled' },
        ],
      },
      {
        id: 'employment_type',
        label: '雇佣类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '全职', value: 'full_time' },
          { label: '兼职', value: 'part_time' },
          { label: '合同', value: 'contract' },
          { label: '实习', value: 'intern' },
          { label: '临时', value: 'temporary' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '职位信息',
      fields: ['title', 'code', 'department_id', 'employment_type', 'location'],
    },
    {
      title: '薪资范围',
      fields: ['salary_min', 'salary_max'],
    },
    {
      title: '时间与状态',
      fields: ['publish_date', 'close_date', 'status'],
    },
    {
      title: '描述与要求',
      fields: ['description', 'requirements'],
    },
  ],

  formColCount: 2,
  createTitle: '新增招聘需求',
  editTitle: '编辑招聘需求',
  detailTitle: '招聘详情',
};
