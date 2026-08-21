import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const forecastSchema: EntitySchema = {
  entity: 'demand_forecast',
  title: i18n.t('pages.forecast_management_page.k3'),
  description: i18n.t('pages.forecast_management_page.k4'),

  api: {
    module: 'aps',
    resource: 'forecasts',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    {
      name: 'forecast_no',
      label: i18n.t('pages.forecast_management_page.k7'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: i18n.t('pages.forecast_management_page.k8'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'forecast_period',
      label: i18n.t('pages.forecast_management_page.k9'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'forecast_date',
      label: i18n.t('pages.forecast_management_page.k9'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'forecast_quantity',
      label: i18n.t('pages.forecast_management_page.k10'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'actual_quantity',
      label: i18n.t('pages.forecast_management_page.k11'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'accuracy_rate',
      label: i18n.t('pages.forecast_management_page.k12'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      listWidth: 120,
    },
    {
      name: 'method',
      label: i18n.t('pages.forecast_management_page.k13'),
      type: 'select',
      defaultValue: 'moving_average',
      options: {
        type: 'static',
        options: [
          { value: 'moving_average', label: i18n.t('pages.forecast_management_page.k0') },
          { value: 'exponential_smoothing', label: i18n.t('pages.forecast_management_page.k1') },
          { value: 'linear_regression', label: i18n.t('pages.forecast_management_page.k2') },
          { value: 'arima', label: 'ARIMA' },
        ],
      },
      listWidth: 160,
    },
    {
      name: 'confidence_level',
      label: i18n.t('pages.forecast_management_page.k13'),
      type: 'number',
      defaultValue: 0.95,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('pages.forecast_management_page.k14'),
      type: 'select',
      defaultValue: 'draft',
      showInList: false,
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'calculated', label: 'Calculated' },
          { value: 'validated', label: 'Validated' },
          { value: 'adopted', label: 'Adopted' },
          { value: 'superseded', label: 'Superseded' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
    },
    {
      name: 'notes',
      label: i18n.t('pages.forecast_management_page.k14'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'forecast_no',
      'product_name',
      'forecast_period',
      'forecast_quantity',
      'actual_quantity',
      'accuracy_rate',
      'method',
    ],
    searchFields: ['forecast_no', 'product_name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formColCount: 2,
  createTitle: i18n.t('pages.forecast_management_page.k3'),
  editTitle: i18n.t('pages.forecast_management_page.k3'),
};
