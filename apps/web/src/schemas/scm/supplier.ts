import type { EntitySchema } from '@/schema';

export const supplierSchema: EntitySchema = {
  entity: 'supplier',
  title: '供应商管理',
  description: '管理供应商基础信息，包括编码、名称、分类、级别、联系方式等',

  api: {
    module: 'scm',
    resource: 'suppliers',
  },

  fields: [
    {
      name: 'code',
      label: '供应商编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '供应商名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: '原材料' },
          { value: 'packaging', label: '包装辅料' },
          { value: 'machinery', label: '机械设备' },
          { value: 'electronics', label: '电子元器件' },
          { value: 'chemicals', label: '化学用品' },
          { value: 'services', label: '服务类' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'level',
      label: '级别',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'strategic', label: '战略供应商' },
          { value: 'preferred', label: '优选供应商' },
          { value: 'regular', label: '常规供应商' },
          { value: 'qualified', label: '合格供应商' },
          { value: 'new', label: '新供应商' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '禁用' },
          { value: 'pending', label: '待审核' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'contact',
      label: '联系人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'phone',
      label: '联系电话',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      showInList: false,
    },
    {
      name: 'address',
      label: '地址',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'rating',
      label: '评分',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'create_date',
      label: '创建日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'level', 'status', 'contact', 'phone', 'rating'],
    searchFields: ['code', 'name', 'contact'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        pending: 'warning',
      },
      labelMap: {
        active: '活跃',
        inactive: '禁用',
        pending: '待审核',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '禁用', value: 'inactive' },
          { label: '待审核', value: 'pending' },
        ],
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '原材料', value: 'raw_material' },
          { label: '包装辅料', value: 'packaging' },
          { label: '机械设备', value: 'machinery' },
          { label: '电子元器件', value: 'electronics' },
          { label: '化学用品', value: 'chemicals' },
          { label: '服务类', value: 'services' },
          { label: '其他', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'level', 'status'],
    },
    {
      title: '联系信息',
      fields: ['contact', 'phone', 'email', 'address'],
    },
    {
      title: '评级信息',
      fields: ['rating', 'create_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增供应商',
  editTitle: '编辑供应商',
  detailTitle: '供应商详情',
};
