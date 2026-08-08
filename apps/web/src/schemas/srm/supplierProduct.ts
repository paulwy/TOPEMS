import type { EntitySchema } from '@/schema';

export const supplierProductSchema: EntitySchema = {
  entity: 'supplier_product',
  title: '供应商产品',
  description: '管理供应商提供的产品信息，包括产品编码、价格、分类、状态等',

  api: {
    module: 'srm',
    resource: 'supplier-products',
  },

  fields: [
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'supplier',
      label: '供应商',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '原材料', label: '原材料' },
          { value: '零部件', label: '零部件' },
          { value: '设备配件', label: '设备配件' },
          { value: '化工原料', label: '化工原料' },
          { value: '电子元器件', label: '电子元器件' },
          { value: '包装材料', label: '包装材料' },
          { value: '服务类', label: '服务类' },
          { value: '其他', label: '其他' },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'price',
      label: '价格',
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const price = row.price as number | undefined;
        return price != null
          ? `¥${price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          : '-';
      },
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      defaultValue: '个',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
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
          { value: 'active', label: '在售' },
          { value: 'inactive', label: '停售' },
          { value: 'pending', label: '待审核' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
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
    },
  ],

  list: {
    columns: ['product_code', 'name', 'supplier', 'category', 'price', 'unit', 'status'],
    searchFields: ['product_code', 'name', 'supplier'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        pending: 'warning',
      },
      labelMap: {
        active: '在售',
        inactive: '停售',
        pending: '待审核',
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['product_code', 'name', 'supplier', 'category'],
    },
    {
      title: '价格与单位',
      fields: ['price', 'unit'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增供应商产品',
  editTitle: '编辑供应商产品',
  detailTitle: '供应商产品详情',
};
