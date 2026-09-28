import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const processFlowSchema: EntitySchema = {
  entity: 'processFlow',
  title: i18n.t('mes.process_flow.k0'),
  api: {
    module: 'mes',
    resource: 'processFlows',
  },
  fields: [
    {
      name: 'code',
      label: i18n.t('mes.process_flow.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      sortable: true,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('mes.process_flow.k2'),
      type: 'text',
      required: true,
      listWidth: 180,
      sortable: true,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'production_line',
      label: i18n.t('mes.process_flow.k3'),
      type: 'text',
      listWidth: 140,
      sortable: true,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'capacity',
      label: i18n.t('mes.process_flow.k4'),
      type: 'number',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>): string => {
        const cap = row.capacity as number | undefined;
        const unit = row.unit as string | undefined;
        return cap ? `${cap} ${unit || i18n.t('mes.process_flow.k5')}` : '-';
      },
    },
    {
      name: 'unit',
      label: i18n.t('mes.process_flow.k6'),
      type: 'select',
      showInList: false,
      options: {
        type: 'static',
        options: [
          { value: i18n.t('mes.process_flow.k7'), label: i18n.t('mes.process_flow.k8') },
          { value: i18n.t('mes.process_flow.k9'), label: i18n.t('mes.process_flow.k10') },
          { value: i18n.t('mes.process_flow.k11'), label: i18n.t('mes.process_flow.k12') },
        ],
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'version',
      label: i18n.t('mes.process_flow.k13'),
      type: 'number',
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('mes.process_flow.k14'),
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('mes.process_flow.k15') },
          { value: 'inactive', label: i18n.t('mes.process_flow.k16') },
          { value: 'draft', label: i18n.t('mes.process_flow.k17') },
        ],
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('mes.process_flow.k18'),
      type: 'textarea',
      colSpan: 2,
      showInList: false,
    },
  ],
  list: {
    searchFields: ['code', 'name', 'production_line'],
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.process_flow.k19'),
        type: 'select',
        options: [
          { label: i18n.t('mes.process_flow.k20'), value: 'all' },
          { label: i18n.t('mes.process_flow.k21'), value: 'active' },
          { label: i18n.t('mes.process_flow.k22'), value: 'inactive' },
          { label: i18n.t('mes.process_flow.k23'), value: 'draft' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        draft: 'warning',
      },
      labelMap: {
        active: i18n.t('mes.process_flow.k24'),
        inactive: i18n.t('mes.process_flow.k25'),
        draft: i18n.t('mes.process_flow.k26'),
      },
    },
    pageSize: 10,
  },
  formSections: [
    {
      title: i18n.t('mes.process_flow.k27'),
      fields: ['code', 'name', 'version', 'status'],
    },
    {
      title: i18n.t('mes.process_flow.k28'),
      fields: ['production_line', 'capacity', 'unit'],
    },
    {
      title: i18n.t('mes.process_flow.k29'),
      fields: ['description'],
    },
  ],
  formColCount: 2,
  actions: ['create', 'edit', 'detail', 'delete'],
};
