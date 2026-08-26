/**
 * 车辆管理 Schema — 驱动 VehiclePage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const vehicleSchema: EntitySchema = {
  entity: 'vehicle',
  title: i18n.t('schema:erp.vehicle.meta.title'),
  description: i18n.t('schema:erp.vehicle.meta.description'),

  api: {
    module: 'erp',
    resource: 'vehicles',
  },

  fields: [
    {
      name: 'plate_number',
      label: i18n.t('schema:erp.vehicle.plate_number.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'brand',
      label: i18n.t('schema:erp.vehicle.brand.label'),
      type: 'text',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'model',
      label: i18n.t('schema:erp.vehicle.model.label'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'vehicle_type',
      label: i18n.t('schema:erp.vehicle.vehicle_type.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'sedan', label: i18n.t('schema:erp.vehicle.vehicle_type.option.sedan') },
          { value: 'suv', label: 'SUV' },
          { value: 'van', label: i18n.t('schema:erp.vehicle.vehicle_type.option.van') },
          { value: 'truck', label: i18n.t('schema:erp.vehicle.vehicle_type.option.truck') },
          { value: 'bus', label: i18n.t('schema:erp.vehicle.vehicle_type.option.bus') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'driver',
      label: i18n.t('schema:erp.vehicle.driver.label'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'mileage',
      label: i18n.t('schema:erp.vehicle.mileage.label'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const mileage = row.mileage as number | undefined;
        return mileage !== undefined ? mileage.toLocaleString() : '-';
      },
    },
    {
      name: 'last_service',
      label: i18n.t('schema:erp.vehicle.last_service.label'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'fuel_type',
      label: i18n.t('schema:erp.vehicle.fuel_type.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'gasoline', label: i18n.t('schema:erp.vehicle.fuel_type.option.gasoline') },
          { value: 'diesel', label: i18n.t('schema:erp.vehicle.fuel_type.option.diesel') },
          { value: 'electric', label: i18n.t('schema:erp.vehicle.fuel_type.option.electric') },
          { value: 'hybrid', label: i18n.t('schema:erp.vehicle.fuel_type.option.hybrid') },
        ],
      },
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.vehicle.status.label'),
      type: 'select',
      defaultValue: 'available',
      options: {
        type: 'static',
        options: [
          { value: 'available', label: i18n.t('schema:erp.vehicle.status.option.available') },
          { value: 'in_use', label: i18n.t('schema:erp.vehicle.status.option.in_use') },
          { value: 'maintenance', label: i18n.t('schema:erp.vehicle.status.option.maintenance') },
          { value: 'unavailable', label: i18n.t('schema:erp.vehicle.status.option.unavailable') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'plate_number',
      'brand',
      'model',
      'vehicle_type',
      'driver',
      'mileage',
      'status',
      'last_service',
    ],
    searchFields: ['plate_number', 'brand'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        available: 'success',
        in_use: 'info',
        maintenance: 'warning',
        unavailable: 'error',
      },
      labelMap: {
        available: i18n.t('schema:erp.vehicle.status.option.available'),
        in_use: i18n.t('schema:erp.vehicle.status.option.in_use'),
        maintenance: i18n.t('schema:erp.vehicle.status.option.maintenance'),
        unavailable: i18n.t('schema:erp.vehicle.status.option.unavailable'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.vehicle.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.vehicle.filter.status.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.vehicle.filter.status.option.available'),
            value: 'available',
          },
          { label: i18n.t('schema:erp.vehicle.filter.status.option.in_use'), value: 'in_use' },
          {
            label: i18n.t('schema:erp.vehicle.filter.status.option.maintenance'),
            value: 'maintenance',
          },
          {
            label: i18n.t('schema:erp.vehicle.filter.status.option.unavailable'),
            value: 'unavailable',
          },
        ],
      },
      {
        id: 'vehicle_type',
        label: i18n.t('schema:erp.vehicle.filter.vehicle_type.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.vehicle.filter.vehicle_type.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.vehicle.filter.vehicle_type.option.sedan'), value: 'sedan' },
          { label: 'SUV', value: 'suv' },
          { label: i18n.t('schema:erp.vehicle.filter.vehicle_type.option.van'), value: 'van' },
          { label: i18n.t('schema:erp.vehicle.filter.vehicle_type.option.truck'), value: 'truck' },
          { label: i18n.t('schema:erp.vehicle.filter.vehicle_type.option.bus'), value: 'bus' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.vehicle.section.0.title'),
      fields: ['plate_number', 'brand', 'model', 'vehicle_type', 'fuel_type'],
    },
    {
      title: i18n.t('schema:erp.vehicle.section.1.title'),
      fields: ['driver', 'mileage', 'last_service', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.vehicle.meta.createTitle'),
  editTitle: i18n.t('schema:erp.vehicle.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.vehicle.meta.detailTitle'),
};
