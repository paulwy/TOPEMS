import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const settingSchema: EntitySchema = {
  entity: 'rd_setting',
  title: i18n.t('rd.setting.k0'),
  description: i18n.t('rd.setting.k1'),

  api: {
    module: 'rd',
    resource: 'settings',
  },

  fields: [
    {
      name: 'id',
      label: 'ID',
      type: 'text',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'name',
      label: i18n.t('rd.setting.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: i18n.t('rd.setting.k3'),
      type: 'text',
      listWidth: 300,
    },
    {
      name: 'enabled',
      label: i18n.t('rd.setting.k4'),
      type: 'switch',
      defaultValue: true,
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'description', 'enabled'],
    searchFields: ['name'],
    pageSize: 20,
    selectable: false,
  },

  formSections: [
    {
      title: i18n.t('rd.setting.k5'),
      fields: ['name', 'description', 'enabled'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.setting.k6'),
  editTitle: i18n.t('rd.setting.k7'),
  detailTitle: i18n.t('rd.setting.k8'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
