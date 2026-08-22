/**
 * 插件管理 Schema — 驱动 PluginManagementPage 的列表展示
 *
 * 插件通过市场安装，不支持直接创建/编辑/删除，
 * 启用/禁用/升级/卸载等操作由页面通过 customRowActions 注入。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';

const PLUGIN_TYPE_LABELS: Record<string, string> = {
  core: i18n.t('admin.plugin.k0'),
  business: i18n.t('admin.plugin.k1'),
};

const RUNTIME_STATUS_LABELS: Record<string, string> = {
  running: i18n.t('admin.plugin.k2'),
  stopped: i18n.t('admin.plugin.k3'),
  unknown: i18n.t('admin.plugin.k4'),
};

const RUNTIME_STATUS_COLORS: Record<string, 'success' | 'error' | 'warning'> = {
  running: 'success',
  stopped: 'error',
  unknown: 'warning',
};

export const pluginSchema: EntitySchema = {
  entity: 'admin_plugin',
  title: i18n.t('schema:admin.plugin.meta.title'),
  description: i18n.t('schema:admin.plugin.meta.description'),

  api: {
    module: 'plugin',
    resource: 'plugins',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('schema:admin.plugin.name.label'),
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
                    fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                    color: `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
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
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: i18n.t('schema:admin.plugin.code.label'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('code', { style: { fontSize: 12 } }, String(row.code || '')),
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'version',
      label: i18n.t('schema:admin.plugin.version.label'),
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
                    padding: `${designTokens.spacing.xs} 6px`,
                    borderRadius: 12,
                    fontSize: 11,
                    backgroundColor: `var(--color-success-lighter, ${designTokens.colors.success['50']})`,
                    color: `var(--color-success-main, ${designTokens.colors.success.dark})`,
                    border: `1px solid var(--color-success-main, ${designTokens.colors.success.dark})`,
                  },
                },
                latestVersion
              )
            : null
        );
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'plugin_type',
      label: i18n.t('schema:admin.plugin.plugin_type.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'core', label: i18n.t('schema:admin.plugin.plugin_type.option.core') },
          { value: 'business', label: i18n.t('schema:admin.plugin.plugin_type.option.business') },
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
              padding: `${designTokens.spacing.xs} 8px`,
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid var(--color-divider, ${designTokens.colors.action.selected})`,
            },
          },
          PLUGIN_TYPE_LABELS[pluginType] || pluginType
        );
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'runtime_status',
      label: i18n.t('schema:admin.plugin.runtime_status.label'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const status = String(row.runtime_status || 'unknown');
        const label = RUNTIME_STATUS_LABELS[status] || status;
        const color = RUNTIME_STATUS_COLORS[status] || 'warning';
        const colorMap: Record<string, string> = {
          success: `var(--color-success-main, ${designTokens.colors.success.dark})`,
          error: `var(--color-error-main, ${designTokens.colors.error['800']})`,
          warning: `var(--color-warning-main, ${designTokens.colors.warning[500]}`,
        };
        const bgColorMap: Record<string, string> = {
          success: `var(--color-success-lighter, ${designTokens.colors.success['50']})`,
          error: `var(--color-error-lighter, ${designTokens.colors.error[50]}`,
          warning: `var(--color-warning-lighter, ${designTokens.colors.warning[50]}`,
        };
        return React.createElement(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: `${designTokens.spacing.xs} 8px`,
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
      label: i18n.t('schema:admin.plugin.runtime_url.label'),
      type: 'text',
      listWidth: 200,
      renderCell: (row: Record<string, unknown>) => {
        const url = row.runtime_url ? String(row.runtime_url) : '-';
        return React.createElement(
          'span',
          {
            style: {
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
              color: `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
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
        label: i18n.t('schema:admin.plugin.filter.plugin_type.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:admin.plugin.filter.plugin_type.option.all'), value: 'all' },
          { label: i18n.t('schema:admin.plugin.filter.plugin_type.option.core'), value: 'core' },
          {
            label: i18n.t('schema:admin.plugin.filter.plugin_type.option.business'),
            value: 'business',
          },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  createTitle: i18n.t('schema:admin.plugin.meta.createTitle'),
  editTitle: i18n.t('schema:admin.plugin.meta.editTitle'),
  detailTitle: i18n.t('schema:admin.plugin.meta.detailTitle'),
};
