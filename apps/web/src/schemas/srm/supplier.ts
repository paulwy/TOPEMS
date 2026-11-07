import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';
import { masterDataSupplierCategoriesApi } from '@/api/master-data/supplierCategories';
import { getNameZhSync } from '@/hooks/useDictionary';

export const supplierSchema: EntitySchema = {
  entity: 'supplier',
  title: i18n.t('srm.supplier.k0'),
  description: i18n.t('srm.supplier.k1'),

  api: {
    module: 'mdm',
    resource: 'suppliers',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'srm:supplier',

  // 字典下拉：category_code 从 /api/master-data/supplier-categories 拉取
  // CrudPage 自动调 useDynamicOptions 拉字典并 merge 到表单字段 options
  dynamicOptions: [
    {
      field: 'category_code',
      queryKey: ['dictionary', 'supplierCategory'],
      loader: async () => {
        const res = await masterDataSupplierCategoriesApi.list();
        if (!res.success || !Array.isArray(res.data)) return [];
        return res.data.map((c) => ({ value: c.code, label: c.name_zh }));
      },
    },
  ],

  fields: [
    {
      name: 'supplier_no',
      label: i18n.t('srm.supplier.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('srm.supplier.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
      renderCell: (row, _index) =>
        localizedName(row.name as string | null, row.name_en as string | null) || '-',
    },
    {
      name: 'legal_name',
      label: i18n.t('srm.supplier.k4'),
      type: 'text',
      listWidth: 160,
      showInList: false,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category_code',
      label: i18n.t('srm.supplier.k5'),
      type: 'select',
      // 切 MDM 后：不选分类合法（category_code 留空），不再强制 required
      // options 由 dynamicOptions 从 /api/master-data/supplier-categories 注入
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
      renderCell: (row: Record<string, unknown>) => {
        // 批 35：列表展示优先 getNameZh(category_code)；无 code 或未命中时回退原 category 自由文本。
        // 自由文本 fallback 仅用于展示历史值，不做业务判断；当前数据全部有 category_code，fallback 永不触发。
        const code = row.category_code;
        const fallback = (row.category as string) || '';
        if (!code) return fallback || '-';
        return getNameZhSync('supplierCategory', code, fallback) || fallback || '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('srm.supplier.k13'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('srm.supplier.k14') },
          { value: 'inactive', label: i18n.t('srm.supplier.k15') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'tax_id',
      label: i18n.t('srm.supplier.k16'),
      type: 'text',
      listWidth: 140,
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'address',
      label: i18n.t('srm.supplier.k17'),
      type: 'textarea',
      listWidth: 200,
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'contact_person',
      label: i18n.t('srm.supplier.k18'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'phone',
      label: i18n.t('srm.supplier.k19'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'email',
      label: i18n.t('srm.supplier.k20'),
      type: 'text',
      listWidth: 160,
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'website',
      label: i18n.t('srm.supplier.k21'),
      type: 'text',
      listWidth: 160,
      showInList: false,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'credit_rating',
      label: i18n.t('srm.supplier.k22'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'AAA', label: 'AAA' },
          { value: 'AA', label: 'AA' },
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
        ],
      },
      listWidth: 100,
      showInList: false,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'risk_level',
      label: i18n.t('srm.supplier.k23'),
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('srm.supplier.k24') },
          { value: 'medium', label: i18n.t('srm.supplier.k25') },
          { value: 'high', label: i18n.t('srm.supplier.k26') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('srm.supplier.k27'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('srm.supplier.k28'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'supplier_no',
      'name',
      'category_code',
      'contact_person',
      'phone',
      'risk_level',
      'status',
      'created_at',
    ],
    searchFields: ['supplier_no', 'name', 'contact_person'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('srm.supplier.k29'),
        inactive: i18n.t('srm.supplier.k30'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.supplier.k31'),
        type: 'select',
        options: [
          { label: i18n.t('srm.supplier.k32'), value: 'all' },
          { label: i18n.t('srm.supplier.k33'), value: 'active' },
          { label: i18n.t('srm.supplier.k34'), value: 'inactive' },
        ],
      },
      {
        // 批 35：filter id 仍叫 'category'（query param 兼容），但后端已按 category_code 过滤。
        // value 是 category_code（raw_material / packaging 等），不是自由文本。
        id: 'category',
        label: i18n.t('srm.supplier.k35'),
        type: 'select',
        options: [
          { label: i18n.t('srm.supplier.k36'), value: 'all' },
          { label: i18n.t('srm.supplier.k37'), value: 'raw_material' },
          { label: i18n.t('srm.supplier.k38'), value: 'packaging' },
          { label: i18n.t('srm.supplier.k39'), value: 'machinery' },
          { label: i18n.t('srm.supplier.k40'), value: 'electronics' },
          { label: i18n.t('srm.supplier.k41'), value: 'chemicals' },
          { label: i18n.t('srm.supplier.k42'), value: 'services' },
          { label: i18n.t('srm.supplier.k43'), value: 'other' },
        ],
      },
      {
        id: 'risk_level',
        label: i18n.t('srm.supplier.k44'),
        type: 'select',
        options: [
          { label: i18n.t('srm.supplier.k45'), value: 'all' },
          { label: i18n.t('srm.supplier.k46'), value: 'low' },
          { label: i18n.t('srm.supplier.k47'), value: 'medium' },
          { label: i18n.t('srm.supplier.k48'), value: 'high' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.supplier.k49'),
      fields: ['supplier_no', 'name', 'legal_name', 'category_code', 'status'],
    },
    {
      title: i18n.t('srm.supplier.k50'),
      fields: ['contact_person', 'phone', 'email', 'address', 'website'],
    },
    {
      title: i18n.t('srm.supplier.k51'),
      fields: ['tax_id', 'credit_rating'],
    },
    {
      title: i18n.t('srm.supplier.k52'),
      fields: ['risk_level', 'created_at', 'updated_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.supplier.k53'),
  editTitle: i18n.t('srm.supplier.k54'),
  detailTitle: i18n.t('srm.supplier.k55'),
};
