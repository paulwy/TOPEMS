/**
 * 公告管理 Schema — 驱动 AnnouncementPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const announcementSchema: EntitySchema = {
  entity: 'announcement',
  title: i18n.t('schema:erp.announcement.meta.title'),
  description: i18n.t('schema:erp.announcement.meta.description'),

  api: {
    module: 'erp',
    resource: 'announcements',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('schema:erp.announcement.title.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'author',
      label: i18n.t('schema:erp.announcement.author.label'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'priority',
      label: i18n.t('schema:erp.announcement.priority.label'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('schema:erp.announcement.priority.option.low') },
          { value: 'normal', label: i18n.t('schema:erp.announcement.priority.option.normal') },
          { value: 'high', label: i18n.t('schema:erp.announcement.priority.option.high') },
          { value: 'urgent', label: i18n.t('schema:erp.announcement.priority.option.urgent') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.announcement.status.label'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('schema:erp.announcement.status.option.draft') },
          { value: 'published', label: i18n.t('schema:erp.announcement.status.option.published') },
          { value: 'archived', label: i18n.t('schema:erp.announcement.status.option.archived') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'content',
      label: i18n.t('schema:erp.announcement.content.label'),
      type: 'textarea',
      required: true,
      showInList: false,
    },
    {
      name: 'publish_at',
      label: i18n.t('schema:erp.announcement.publish_at.label'),
      type: 'datetime',
      showInList: false,
    },
  ],

  list: {
    columns: ['title', 'priority', 'status', 'author', 'publish_at'],
    searchFields: ['title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'success',
        archived: 'info',
      },
      labelMap: {
        draft: i18n.t('schema:erp.announcement.status.option.draft'),
        published: i18n.t('schema:erp.announcement.status.option.published'),
        archived: i18n.t('schema:erp.announcement.status.option.archived'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.announcement.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.announcement.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.announcement.filter.status.option.draft'), value: 'draft' },
          {
            label: i18n.t('schema:erp.announcement.filter.status.option.published'),
            value: 'published',
          },
          {
            label: i18n.t('schema:erp.announcement.filter.status.option.archived'),
            value: 'archived',
          },
        ],
      },
      {
        id: 'priority',
        label: i18n.t('schema:erp.announcement.filter.priority.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.announcement.filter.priority.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.announcement.filter.priority.option.low'), value: 'low' },
          {
            label: i18n.t('schema:erp.announcement.filter.priority.option.normal'),
            value: 'normal',
          },
          { label: i18n.t('schema:erp.announcement.filter.priority.option.high'), value: 'high' },
          {
            label: i18n.t('schema:erp.announcement.filter.priority.option.urgent'),
            value: 'urgent',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.announcement.section.0.title'),
      fields: ['title', 'author', 'priority', 'status'],
    },
    {
      title: i18n.t('schema:erp.announcement.section.1.title'),
      fields: ['content', 'publish_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.announcement.meta.createTitle'),
  editTitle: i18n.t('schema:erp.announcement.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.announcement.meta.detailTitle'),
};
