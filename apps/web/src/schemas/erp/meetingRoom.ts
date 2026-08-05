import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const meetingRoomSchema: EntitySchema = {
  entity: 'meetingRoom',
  title: i18n.t('schema:erp.meeting_room.meta.title'),
  description: i18n.t('schema:erp.meeting_room.meta.description'),

  api: {
    module: 'erp',
    resource: 'meetingRooms',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('schema:erp.meeting_room.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'location',
      label: i18n.t('schema:erp.meeting_room.location.label'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'capacity',
      label: i18n.t('schema:erp.meeting_room.capacity.label'),
      type: 'number',
      defaultValue: 10,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'facilities',
      label: i18n.t('schema:erp.meeting_room.facilities.label'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.meeting_room.status.label'),
      type: 'select',
      defaultValue: 'available',
      options: {
        type: 'static',
        options: [
          { value: 'available', label: i18n.t('schema:erp.meeting_room.status.option.available') },
          { value: 'occupied', label: i18n.t('schema:erp.meeting_room.status.option.occupied') },
          { value: 'maintenance', label: i18n.t('schema:erp.meeting_room.status.option.maintenance') },
          { value: 'unavailable', label: i18n.t('schema:erp.meeting_room.status.option.unavailable') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'location', 'capacity', 'facilities', 'status'],
    searchFields: ['name', 'location'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        available: 'success',
        occupied: 'warning',
        maintenance: 'info',
        unavailable: 'error',
      },
      labelMap: {
        available: i18n.t('schema:erp.meeting_room.status.option.available'),
        occupied: i18n.t('schema:erp.meeting_room.status.option.occupied'),
        maintenance: i18n.t('schema:erp.meeting_room.status.option.maintenance'),
        unavailable: i18n.t('schema:erp.meeting_room.status.option.unavailable'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.meeting_room.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.meeting_room.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.meeting_room.filter.status.option.available'), value: 'available' },
          { label: i18n.t('schema:erp.meeting_room.filter.status.option.occupied'), value: 'occupied' },
          { label: i18n.t('schema:erp.meeting_room.filter.status.option.maintenance'), value: 'maintenance' },
          { label: i18n.t('schema:erp.meeting_room.filter.status.option.unavailable'), value: 'unavailable' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.meeting_room.section.0.title'),
      fields: ['name', 'location', 'capacity'],
    },
    {
      title: i18n.t('schema:erp.meeting_room.section.1.title'),
      fields: ['facilities', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.meeting_room.meta.createTitle'),
  editTitle: i18n.t('schema:erp.meeting_room.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.meeting_room.meta.detailTitle'),
};
