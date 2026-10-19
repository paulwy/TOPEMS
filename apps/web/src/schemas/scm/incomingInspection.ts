import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

/**
 * 来料检验（incoming_inspections）Schema
 * 契约：GET/POST /incoming-inspections，GET/PUT /incoming-inspections/{id}，
 *       POST /incoming-inspections/{id}/pass、/reject（权限 list=PurchaseOrderRead、处置=PurchaseOrderWrite）
 * 状态流转：pending（待检验）→ passed（合格）/ failed（不合格）；数量字段对齐后端 float8 返回
 */
export const incomingInspectionSchema: EntitySchema = {
  entity: 'incomingInspection',
  title: i18n.t('scm.incoming_inspection.k0'),
  description: i18n.t('scm.incoming_inspection.k1'),

  api: {
    module: 'scm',
    resource: 'incomingInspections',
  },

  fields: [
    {
      name: 'inspection_number',
      label: i18n.t('scm.incoming_inspection.id_2'),
      type: 'text',
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'notice_number',
      label: i18n.t('scm.incoming_inspection.k3'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'notice_id',
      label: i18n.t('scm.incoming_inspection.k28'),
      type: 'text',
      required: true,
      hideInList: true,
      readonlyOnEdit: true,
    },
    {
      name: 'material_code',
      label: i18n.t('scm.incoming_inspection.k4'),
      type: 'text',
      sortable: true,
      listWidth: 120,
      required: true,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'material_name',
      label: i18n.t('scm.incoming_inspection.k5'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      required: true,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'specification',
      label: i18n.t('scm.incoming_inspection.k6'),
      type: 'text',
      listWidth: 120,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'unit',
      label: i18n.t('scm.incoming_inspection.k7'),
      type: 'text',
      listWidth: 70,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'batch_number',
      label: i18n.t('scm.incoming_inspection.k8'),
      type: 'text',
      listWidth: 120,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'inspected_quantity',
      label: i18n.t('scm.incoming_inspection.k9'),
      type: 'number',
      defaultValue: 0,
      required: true,
      sortable: true,
      align: 'right',
      listWidth: 100,
      readonlyOnEdit: true,
    },
    {
      name: 'passed_quantity',
      label: i18n.t('scm.incoming_inspection.k10'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'failed_quantity',
      label: i18n.t('scm.incoming_inspection.k11'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'sampling_quantity',
      label: i18n.t('scm.incoming_inspection.k12'),
      type: 'number',
      align: 'right',
      listWidth: 100,
      readonlyOnEdit: true,
    },
    {
      name: 'inspection_result',
      label: i18n.t('scm.incoming_inspection.k13'),
      type: 'text',
      listWidth: 110,
      hideInForm: true,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'inspection_date',
      label: i18n.t('scm.incoming_inspection.k14'),
      type: 'date',
      sortable: true,
      listWidth: 110,
      readonlyOnEdit: true,
    },
    {
      name: 'inspector_name',
      label: i18n.t('scm.incoming_inspection.k15'),
      type: 'text',
      listWidth: 110,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'status',
      label: i18n.t('scm.incoming_inspection.k16'),
      type: 'select',
      defaultValue: 'pending',
      sortable: true,
      listWidth: 90,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('scm.incoming_inspection.k17'), value: 'pending' },
          { label: i18n.t('scm.incoming_inspection.k18'), value: 'passed' },
          { label: i18n.t('scm.incoming_inspection.k19'), value: 'failed' },
        ],
      },
    },
    {
      name: 'remarks',
      label: i18n.t('scm.incoming_inspection.k20'),
      type: 'textarea',
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 500 }],
    },
  ],

  list: {
    columns: [
      'inspection_number',
      'notice_number',
      'material_code',
      'material_name',
      'batch_number',
      'inspected_quantity',
      'passed_quantity',
      'failed_quantity',
      'status',
      'inspection_date',
      'inspector_name',
    ],
    searchFields: ['inspection_number', 'material_code', 'material_name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.incoming_inspection.k16'),
        type: 'select',
        options: [
          { label: i18n.t('scm.incoming_inspection.k21'), value: 'all' },
          { label: i18n.t('scm.incoming_inspection.k17'), value: 'pending' },
          { label: i18n.t('scm.incoming_inspection.k18'), value: 'passed' },
          { label: i18n.t('scm.incoming_inspection.k19'), value: 'failed' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail'],

  formSections: [
    {
      title: i18n.t('scm.incoming_inspection.k22'),
      fields: ['notice_id', 'material_code', 'material_name', 'specification'],
    },
    {
      title: i18n.t('scm.incoming_inspection.k23'),
      fields: ['unit', 'batch_number', 'inspected_quantity', 'sampling_quantity', 'remarks'],
    },
    {
      title: i18n.t('scm.incoming_inspection.k24'),
      fields: ['passed_quantity', 'failed_quantity', 'status', 'inspection_date', 'inspector_name'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.incoming_inspection.k25'),
  editTitle: i18n.t('scm.incoming_inspection.k26'),
  detailTitle: i18n.t('scm.incoming_inspection.k27'),
};
