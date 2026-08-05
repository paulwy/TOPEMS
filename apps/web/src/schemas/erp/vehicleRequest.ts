import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const vehicleRequestSchema: EntitySchema = {
  entity: 'vehicleRequest',
  title: i18n.t('schema:erp.vehicle_request.meta.title'),
  description: i18n.t('schema:erp.vehicle_request.meta.description'),

  api: {
    module: 'erp',
    resource: 'vehicleRequests',
  },

  fields: [
    {
      name: 'vehicle_plate',
      label: i18n.t('schema:erp.vehicle_request.vehicle_plate.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'requester',
      label: i18n.t('schema:erp.vehicle_request.requester.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'purpose',
      label: i18n.t('schema:erp.vehicle_request.purpose.label'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'start_time',
      label: i18n.t('schema:erp.vehicle_request.start_time.label'),
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'end_time',
      label: i18n.t('schema:erp.vehicle_request.end_time.label'),
      type: 'datetime',
      required: true,
      listWidth: 160,
    },
    {
      name: 'driver_required',
      label: i18n.t('schema:erp.vehicle_request.driver_required.label'),
      type: 'switch',
      defaultValue: false,
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.vehicle_request.status.label'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('schema:erp.vehicle_request.status.option.pending') },
          { value: 'approved', label: i18n.t('schema:erp.vehicle_request.status.option.approved') },
          { value: 'rejected', label: i18n.t('schema:erp.vehicle_request.status.option.rejected') },
          {
            value: 'completed',
            label: i18n.t('schema:erp.vehicle_request.status.option.completed'),
          },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['vehicle_plate', 'requester', 'purpose', 'start_time', 'status'],
    searchFields: ['vehicle_plate', 'requester', 'purpose'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        completed: 'default',
      },
      labelMap: {
        pending: i18n.t('schema:erp.vehicle_request.status.option.pending'),
        approved: i18n.t('schema:erp.vehicle_request.status.option.approved'),
        rejected: i18n.t('schema:erp.vehicle_request.status.option.rejected'),
        completed: i18n.t('schema:erp.vehicle_request.status.option.completed'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.vehicle_request.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.vehicle_request.filter.status.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.vehicle_request.filter.status.option.pending'),
            value: 'pending',
          },
          {
            label: i18n.t('schema:erp.vehicle_request.filter.status.option.approved'),
            value: 'approved',
          },
          {
            label: i18n.t('schema:erp.vehicle_request.filter.status.option.rejected'),
            value: 'rejected',
          },
          {
            label: i18n.t('schema:erp.vehicle_request.filter.status.option.completed'),
            value: 'completed',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.vehicle_request.section.0.title'),
      fields: ['vehicle_plate', 'requester', 'purpose', 'driver_required'],
    },
    {
      title: i18n.t('schema:erp.vehicle_request.section.1.title'),
      fields: ['start_time', 'end_time', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.vehicle_request.meta.createTitle'),
  editTitle: i18n.t('schema:erp.vehicle_request.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.vehicle_request.meta.detailTitle'),
};
