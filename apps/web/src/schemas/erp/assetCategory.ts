import type { EntitySchema } from '@/schema';
import { assetCategoryApi, type AssetCategory } from '@/api/asset/assetCategory';
import i18n from '@/i18n';

/**
 * 计算"自身及全部后代"的 id 集合（parentId 自引用树，防成环）
 */
function computeSelfAndDescendants(items: AssetCategory[], selfId: string): Set<string> {
  const childMap = new Map<string, string[]>();
  items.forEach((c) => {
    if (c.parentId) {
      const arr = childMap.get(c.parentId) ?? [];
      arr.push(c.id);
      childMap.set(c.parentId, arr);
    }
  });
  const excluded = new Set<string>([selfId]);
  const stack = [selfId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const childId of childMap.get(id) ?? []) {
      if (!excluded.has(childId)) {
        excluded.add(childId);
        stack.push(childId);
      }
    }
  }
  return excluded;
}

/**
 * 加载可选父分类（自引用树选择器）
 *
 * 编辑态下需要排除"自身及后代"，防止把自己挂成自己的父级形成环。
 * CrudPage 的 dynamicDeps 只采集表单内字段值（表单不含记录 id），
 * 故以不可变且 readonlyOnEdit 的 code 定位当前记录；
 * deps 中无 code（新建态 / 尚未交互）时全部可选。
 */
async function loadParentCategories(
  deps?: Record<string, unknown>
): Promise<{ value: string; label: string }[]> {
  try {
    const response = await assetCategoryApi.list({ page_size: 1000 });
    if (!response.success || !response.data?.items) {
      return [];
    }
    const items = response.data.items;

    const selfCode = typeof deps?.code === 'string' ? deps.code : '';
    const self = selfCode ? items.find((c) => c.code === selfCode) : undefined;
    if (!self) {
      return items.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
    }

    const excluded = computeSelfAndDescendants(items, self.id);
    return items
      .filter((c) => !excluded.has(c.id))
      .map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  } catch {
    return [];
  }
}

export const assetCategorySchema: EntitySchema = {
  entity: 'asset_category',
  title: i18n.t('schema:erp.asset_category.meta.title'),
  description: i18n.t('schema:erp.asset_category.meta.description'),

  api: {
    module: 'erp',
    resource: 'assetCategories',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'erp:asset',

  fields: [
    {
      name: 'code',
      label: i18n.t('schema:erp.asset_category.code.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('schema:erp.asset_category.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'parentId',
      label: i18n.t('schema:erp.asset_category.parentId.label'),
      type: 'select',
      showInList: false,
      listWidth: 150,
    },
    {
      name: 'description',
      label: i18n.t('schema:erp.asset_category.description.label'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.asset_category.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.asset_category.status.option.active') },
          { value: 'inactive', label: i18n.t('schema:erp.asset_category.status.option.inactive') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('schema:erp.asset_category.created_at.label'),
      type: 'date',
      listWidth: 160,
    },
  ],

  list: {
    columns: ['code', 'name', 'status', 'created_at'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('schema:erp.asset_category.status.option.active'),
        inactive: i18n.t('schema:erp.asset_category.status.option.inactive'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.asset_category.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.asset_category.filter.status.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.asset_category.filter.status.option.active'),
            value: 'active',
          },
          {
            label: i18n.t('schema:erp.asset_category.filter.status.option.inactive'),
            value: 'inactive',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.asset_category.section.0.title'),
      fields: ['code', 'name', 'parentId'],
    },
    {
      title: i18n.t('schema:erp.asset_category.section.1.title'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.asset_category.meta.createTitle'),
  editTitle: i18n.t('schema:erp.asset_category.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.asset_category.meta.detailTitle'),

  dynamicOptions: [
    {
      field: 'parentId',
      loader: loadParentCategories,
      dependencies: ['code'],
    },
  ],
};
