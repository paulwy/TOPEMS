/**
 * 插件管理 Schema — 驱动 PluginManagementPage 的列表展示
 *
 * 插件通过市场安装，不支持直接创建/编辑/删除，
 * 启用/禁用/升级/卸载等操作由页面通过 customRowActions 注入。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

const PLUGIN_TYPE_LABELS: Record<string, string> = {
  core: '核心插件',
  business: '业务插件',
};

const RUNTIME_STATUS_LABELS: Record<string, string> = {
  running: '运行中',
  stopped: '已停止',
  unknown: '未知',
};

const RUNTIME_STATUS_COLORS: Record<string, 'success' | 'error' | 'warning'> = {
  running: 'success',
  stopped: 'error',
  unknown: 'warning',
};

export const pluginSchema: EntitySchema = {
  entity: 'admin_plugin',
  title: '插件管理',
  description: '管理系统插件，启用、禁用或卸载插件',

  api: {
    module: 'plugin',
    resource: 'plugins',
  },

  fields: [
    {
      name: 'name',
      label: '名称',
      type: 'text',
      sortable: true,
      listWidth: 250,
      renderCell: (row: Record<string, unknown>) => {
        const name = String(row.name || '');
        const description = row.description ? String(row.description) : '';
        return React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column' } },
          React.createElement('span', { style: { fontWeight: 500 } }, name),
          description
            ? React.createElement(
                'span',
                {
                  style: {
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                },
                description
              )
            : null
        );
      },
    },
    {
      name: 'code',
      label: '代码',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('code', { style: { fontSize: 12 } }, String(row.code || '')),
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const version = String(row.version || '');
        const latestVersion = row.latest_version ? String(row.latest_version) : '';
        const hasUpdate = latestVersion && latestVersion !== version;
        return React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('code', { style: { fontSize: 12 } }, version),
          hasUpdate
            ? React.createElement(
                'span',
                {
                  style: {
                    padding: '2px 6px',
                    borderRadius: 12,
                    fontSize: 11,
                    backgroundColor: 'var(--color-success-lighter, #e8f5e9)',
                    color: 'var(--color-success-main, #2e7d32)',
                    border: '1px solid var(--color-success-main, #2e7d32)',
                  },
                },
                latestVersion
              )
            : null
        );
      },
    },
    {
      name: 'plugin_type',
      label: '类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'core', label: '核心插件' },
          { value: 'business', label: '业务插件' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const pluginType = String(row.plugin_type || '');
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--color-divider, rgba(0,0,0,0.12))',
            },
          },
          PLUGIN_TYPE_LABELS[pluginType] || pluginType
        );
      },
    },
    {
      name: 'runtime_status',
      label: '状态',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const status = String(row.runtime_status || 'unknown');
        const label = RUNTIME_STATUS_LABELS[status] || status;
        const color = RUNTIME_STATUS_COLORS[status] || 'warning';
        const colorMap: Record<string, string> = {
          success: 'var(--color-success-main, #2e7d32)',
          error: 'var(--color-error-main, #c62828)',
          warning: 'var(--color-warning-main, #ed6c02)',
        };
        const bgColorMap: Record<string, string> = {
          success: 'var(--color-success-lighter, #e8f5e9)',
          error: 'var(--color-error-lighter, #ffebee)',
          warning: 'var(--color-warning-lighter, #fff3e0)',
        };
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: bgColorMap[color],
              color: colorMap[color],
            },
          },
          React.createElement('span', {
            style: {
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: colorMap[color],
            },
          }),
          label
        );
      },
    },
    {
      name: 'runtime_url',
      label: '运行地址',
      type: 'text',
      listWidth: 200,
      renderCell: (row: Record<string, unknown>) => {
        const url = row.runtime_url ? String(row.runtime_url) : '-';
        return React.createElement(
          'span',
          {
            style: {
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
            },
          },
          url
        );
      },
    },
  ],

  list: {
    columns: ['name', 'code', 'version', 'plugin_type', 'runtime_status', 'runtime_url'],
    searchFields: ['name', 'code', 'description'],
    pageSize: 20,
    filters: [
      {
        id: 'plugin_type',
        label: '插件类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '核心插件', value: 'core' },
          { label: '业务插件', value: 'business' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  createTitle: '安装插件',
  editTitle: '编辑插件',
  detailTitle: '插件详情',
};
