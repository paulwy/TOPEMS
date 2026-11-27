/**
 * 供应商管理 Schema — 驱动 SupplierManagementPage 的完整 CRUD
 *
 * 切 MDM 权威源（2026-11-07）：字段名对齐 mdm_suppliers 原生 snake_case，
 * 只保留 mdm 实际返回且有意义的列；mdm 不支持且页面无法填出真实值的字段
 * （short_name/country/province/city/zip_code）已删除，避免列表空列。
 */

import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { masterDataSupplierCategoriesApi } from '@/api/master-data/supplierCategories';
import { getNameZhSync } from '@/hooks/useDictionary';

/**
 * 供应商管理 Schema
 */
export const supplierSchema: EntitySchema = {
  entity: 'supplier',
  title: i18n.t('schema:erp.supplier.meta.title'),
  description: i18n.t('schema:erp.supplier.meta.description'),

  api: {
    module: 'mdm',
    resource: 'suppliers',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'erp:supplier',

  // 字典下拉：category_code 从 /api/master-data/supplier-categories 拉取
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
      label: i18n.t('schema:erp.supplier.supplier_code.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('schema:erp.supplier.supplier_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category_code',
      label: i18n.t('schema:erp.supplier.category.label'),
      type: 'select',
      // options 由 dynamicOptions 从 mdm 字典注入；不选合法（category_code 留空）
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
      // A-15：显式声明两个形参，避免被 toColumnDef 按「单元格值」签名调用（否则分类列恒为 '-'）
      renderCell: (row: Record<string, unknown>, _index: number) => {
        const code = row?.category_code;
        const fallback = (row?.category as string) || '';
        if (!code) return fallback || '-';
        return getNameZhSync('supplierCategory', code, fallback) || fallback || '-';
      },
    },
    {
      name: 'credit_rating',
      label: i18n.t('schema:erp.supplier.credit_rating.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'AAA', label: i18n.t('schema:erp.supplier.credit_rating.option.AAA') },
          { value: 'AA', label: i18n.t('schema:erp.supplier.credit_rating.option.AA') },
          { value: 'A', label: i18n.t('schema:erp.supplier.credit_rating.option.A') },
          { value: 'BBB', label: i18n.t('schema:erp.supplier.credit_rating.option.BBB') },
          { value: 'BB', label: i18n.t('schema:erp.supplier.credit_rating.option.BB') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.supplier.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.supplier.status.option.active') },
          { value: 'inactive', label: i18n.t('schema:erp.supplier.status.option.inactive') },
          { value: 'blacklisted', label: i18n.t('schema:erp.supplier.status.option.blacklisted') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'contact_person',
      label: i18n.t('schema:erp.supplier.contact_person.label'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'phone',
      label: i18n.t('schema:erp.supplier.contact_phone.label'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'email',
      label: i18n.t('schema:erp.supplier.contact_email.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'address',
      label: i18n.t('schema:erp.supplier.address.label'),
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'tax_id',
      label: i18n.t('schema:erp.supplier.tax_number.label'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'bank_name',
      label: i18n.t('schema:erp.supplier.bank_name.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'bank_account',
      label: i18n.t('schema:erp.supplier.bank_account.label'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'remarks',
      label: i18n.t('schema:erp.supplier.remark.label'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'supplier_no',
      'name',
      'contact_person',
      'phone',
      'category_code',
      'credit_rating',
      'status',
    ],
    searchFields: ['supplier_no', 'name', 'contact_person'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        blacklisted: 'error',
      },
      labelMap: {
        active: i18n.t('schema:erp.supplier.status.option.active'),
        inactive: i18n.t('schema:erp.supplier.status.option.inactive'),
        blacklisted: i18n.t('schema:erp.supplier.status.option.blacklisted'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.supplier.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.supplier.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.supplier.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.supplier.filter.status.option.inactive'), value: 'inactive' },
          {
            label: i18n.t('schema:erp.supplier.filter.status.option.blacklisted'),
            value: 'blacklisted',
          },
        ],
      },
      {
        id: 'category',
        label: i18n.t('schema:erp.supplier.filter.category.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.supplier.filter.category.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.supplier.filter.category.option.原材料供应商'),
            value: i18n.t('shared.supplier.k2'),
          },
          {
            label: i18n.t('schema:erp.supplier.filter.category.option.配件供应商'),
            value: i18n.t('shared.supplier.k3'),
          },
          {
            label: i18n.t('schema:erp.supplier.filter.category.option.设备供应商'),
            value: i18n.t('shared.supplier.k4'),
          },
          {
            label: i18n.t('schema:erp.supplier.filter.category.option.服务供应商'),
            value: i18n.t('shared.supplier.k5'),
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.supplier.section.0.title'),
      fields: ['supplier_no', 'name', 'category_code', 'status', 'credit_rating'],
    },
    {
      title: i18n.t('schema:erp.supplier.section.1.title'),
      fields: ['contact_person', 'phone', 'email', 'address'],
    },
    {
      title: i18n.t('schema:erp.supplier.section.2.title'),
      fields: ['tax_id', 'bank_name', 'bank_account'],
    },
    {
      title: i18n.t('schema:erp.supplier.section.3.title'),
      fields: ['remarks'],
    },
  ],

  formColCount: 3,
  createTitle: i18n.t('schema:erp.supplier.meta.createTitle'),
  editTitle: i18n.t('schema:erp.supplier.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.supplier.meta.detailTitle'),
};
