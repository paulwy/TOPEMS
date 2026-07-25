/**
 * 公告管理 Schema — 驱动 AnnouncementPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const announcementSchema: EntitySchema = {
  entity: 'announcement',
  title: '公告管理',
  description: '管理系统公告，包括标题、内容、优先级、发布状态等',

  api: {
    module: 'erp',
    resource: 'announcements',
  },

  fields: [
    {
      name: 'title',
      label: '公告标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'author',
      label: '发布人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'normal', label: '中' },
          { value: 'high', label: '高' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'content',
      label: '公告内容',
      type: 'textarea',
      required: true,
      showInList: false,
    },
    {
      name: 'publish_at',
      label: '发布时间',
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
        draft: '草稿',
        published: '已发布',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已发布', value: 'published' },
          { label: '已归档', value: 'archived' },
        ],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '低', value: 'low' },
          { label: '中', value: 'normal' },
          { label: '高', value: 'high' },
          { label: '紧急', value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['title', 'author', 'priority', 'status'],
    },
    {
      title: '公告内容',
      fields: ['content', 'publish_at'],
    },
  ],

  formColCount: 2,
  createTitle: '新增公告',
  editTitle: '编辑公告',
  detailTitle: '公告详情',
};
