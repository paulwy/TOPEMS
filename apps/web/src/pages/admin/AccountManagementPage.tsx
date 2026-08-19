/**
 * 会计科目管理页面
 *
 * 使用 CrudPage + accountSchema 实现 schema 驱动的 CRUD。
 * 支持列表展示、创建、编辑、删除、筛选，以及余额展示和统计卡片。
 */
import React, { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { getAccountSchema } from '@/schemas/admin';
import { accountApi } from '@/api/finance/account';
import type { Account, AccountBalance } from '@/types/finance';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const AccountManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const page = (params?.page as number) || 1;
        const pageSize = (params?.pageSize as number) || 20;
        const search = (params?.search as string) || '';
        const typeFilter = (params?.type as string) || undefined;
        const isDetailFilter = (params?.is_detail as string) || undefined;
        const queryParams: Record<string, unknown> = {
          page,
          pagesize: pageSize,
        };
        if (search) queryParams.keyword = search;
        if (typeFilter && typeFilter !== 'all') queryParams.category = typeFilter;
        if (isDetailFilter && isDetailFilter !== 'all') {
          queryParams.status = isDetailFilter === 'detail' ? 'detail' : 'summary';
        }
        const response = await accountApi.list(queryParams);
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        const accounts = response.data.items || [];
        // 尝试获取余额数据并合并
        let balances: AccountBalance[] = [];
        try {
          const period = new Date().toISOString().slice(0, 7);
          const balanceResp = await accountApi.getBalances({
            company_id: 'default',
            period,
          });
          if (balanceResp.success && balanceResp.data) {
            balances = balanceResp.data;
          }
        } catch (err) {
          logger.warn(i18n.t('pages.account_management_page.k0'), err);
        }
        const merged = accounts.map((account: Account) => {
          const balance = balances.find((b) => b.account_id === account.id);
          return {
            ...account,
            balance: balance ? balance.debit_balance || balance.credit_balance || 0 : null,
          };
        });
        return {
          data: merged as unknown as Record<string, unknown>[],
          total: response.data.total || accounts.length,
        };
      },
      create: async (data) => {
        const response = await accountApi.create(data as Partial<Account>);
        if (!response.success) {
          throw new Error(response.message || i18n.t('admin.account_management_page.k0'));
        }
        addNotification({
          title: i18n.t('admin.account_management_page.k1'),
          message: i18n.t('admin.account_management_page.k2'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const response = await accountApi.update(String(id), data as Partial<Account>);
        if (!response.success) {
          throw new Error(response.message || i18n.t('admin.account_management_page.k3'));
        }
        addNotification({
          title: i18n.t('admin.account_management_page.k4'),
          message: i18n.t('admin.account_management_page.k5'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await accountApi.delete(String(id));
        if (!response.success) {
          throw new Error(response.message || i18n.t('admin.account_management_page.k6'));
        }
        addNotification({
          title: i18n.t('admin.account_management_page.k7'),
          message: i18n.t('admin.account_management_page.k8'),
          type: 'success',
        });
      },
    }),
    [addNotification]
  );
  const customColumns: ColumnDef[] = useMemo(
    () => [
      {
        id: 'code',
        label: i18n.t('admin.account_management_page.k9'),
        sortable: true,
        width: 140,
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {String(row.code || '')}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: i18n.t('admin.account_management_page.k10'),
        sortable: true,
        width: 180,
        render: (row) => (
          <Typography sx={{ fontWeight: row.is_detail ? 400 : 500 }}>
            {String(row.name || '')}
          </Typography>
        ),
      },
      {
        id: 'type',
        label: i18n.t('admin.account_management_page.k11'),
        width: 100,
        render: (row) => {
          const type = String(row.type || '');
          const labels: Record<string, string> = {
            asset: i18n.t('admin.account_management_page.k12'),
            liability: i18n.t('admin.account_management_page.k13'),
            equity: i18n.t('admin.account_management_page.k14'),
            revenue: i18n.t('admin.account_management_page.k15'),
            expense: i18n.t('admin.account_management_page.k16'),
            cost: i18n.t('admin.account_management_page.k17'),
          };
          const colors: Record<string, string> = {
            asset: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
            liability: `var(--color-error-main, ${designTokens.colors.error['800']})`,
            equity: `var(--color-success-main, ${designTokens.colors.success.dark})`,
            revenue: `var(--color-info-main, ${designTokens.colors.info[600]}`,
            expense: `var(--color-warning-main, ${designTokens.colors.warning[500]}`,
            cost: `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
          };
          const bgColors: Record<string, string> = {
            asset: `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`,
            liability: `var(--color-error-lighter, ${designTokens.colors.error[50]}`,
            equity: `var(--color-success-lighter, ${designTokens.colors.success['50']})`,
            revenue: `var(--color-info-lighter, ${designTokens.colors.info[50]}`,
            expense: `var(--color-warning-lighter, ${designTokens.colors.warning[50]}`,
            cost: `var(--color-action-hover, ${designTokens.colors.action.hover}`,
          };
          const label = labels[type] || type;
          const color = colors[type] || colors.cost;
          const bgColor = bgColors[type] || bgColors.cost;
          return (
            <span
              style={{
                display: 'inline-block',
                padding: `${designTokens.spacing.xs} 8px`,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: bgColor,
                color,
              }}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: 'balance_direction',
        label: i18n.t('admin.account_management_page.k18'),
        width: 100,
        render: (row) => {
          const direction = String(row.balance_direction || '');
          const label =
            direction === 'debit'
              ? i18n.t('admin.account_management_page.k20')
              : direction === 'credit'
                ? i18n.t('admin.account_management_page.k19')
                : direction;
          const color =
            direction === 'debit'
              ? `var(--color-primary-main, ${designTokens.colors.primary.dark})`
              : `var(--color-error-main, ${designTokens.colors.error['800']})`;
          const bgColor =
            direction === 'debit'
              ? `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`
              : `var(--color-error-lighter, ${designTokens.colors.error[50]}`;
          return (
            <span
              style={{
                display: 'inline-block',
                padding: `${designTokens.spacing.xs} 8px`,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: bgColor,
                color,
              }}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: 'is_detail',
        label: i18n.t('admin.account_management_page.k21'),
        width: 110,
        render: (row) => {
          const isDetail = row.is_detail === true;
          return (
            <span
              style={{
                display: 'inline-block',
                padding: `${designTokens.spacing.xs} 8px`,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${isDetail ? `var(--color-primary-main, ${designTokens.colors.primary[700]}` : `var(--color-divider, ${designTokens.colors.action.selected}`}`,
                backgroundColor: isDetail
                  ? `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`
                  : 'transparent',
                color: isDetail
                  ? `var(--color-primary-main, ${designTokens.colors.primary.dark})`
                  : `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
              }}
            >
              {isDetail
                ? i18n.t('admin.account_management_page.k23')
                : i18n.t('admin.account_management_page.k22')}
            </span>
          );
        },
      },
      {
        id: 'isactive',
        label: i18n.t('admin.account_management_page.k24'),
        width: 90,
        render: (row) => {
          const isActive = row.isactive !== false;
          const color = isActive
            ? `var(--color-success-main, ${designTokens.colors.success.dark})`
            : `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`;
          const bgColor = isActive
            ? `var(--color-success-lighter, ${designTokens.colors.success['50']})`
            : `var(--color-action-hover, ${designTokens.colors.action.hover}`;
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: `${designTokens.spacing.xs} 8px`,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: bgColor,
                color,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: color,
                }}
              />
              {isActive
                ? i18n.t('admin.account_management_page.k26')
                : i18n.t('admin.account_management_page.k25')}
            </span>
          );
        },
      },
      {
        id: 'balance',
        label: i18n.t('admin.account_management_page.k27'),
        align: 'right',
        width: 140,
        render: (row) => {
          const balance = row.balance;
          if (balance === null || balance === undefined) return '-';
          const amount = Number(balance) || 0;
          return (
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: amount >= 0 ? 'green' : 'red',
              }}
            >
              {amount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          );
        },
      },
    ],
    []
  );
  const headerContent = useCallback((rows: Record<string, unknown>[]) => {
    const accounts = rows as unknown as Account[];
    const stats = {
      total: accounts.length,
      detail: accounts.filter((a) => a.is_detail).length,
      summary: accounts.filter((a) => !a.is_detail).length,
      inactive: accounts.filter((a) => !a.isactive).length,
    };
    const statCards = [
      {
        label: i18n.t('admin.account_management_page.k28'),
        value: stats.total,
        color: 'primary.main',
      },
      {
        label: i18n.t('admin.account_management_page.k29'),
        value: stats.detail,
        color: 'success.main',
      },
      {
        label: i18n.t('admin.account_management_page.k30'),
        value: stats.summary,
        color: 'info.main',
      },
      {
        label: i18n.t('admin.account_management_page.k31'),
        value: stats.inactive,
        color: 'warning.main',
      },
    ];
    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {statCards.map((stat) => (
            <Box
              key={stat.label}
              sx={{
                bgcolor: 'common.white',
                borderRadius: 2,
                p: 3,
              }}
            >
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: stat.color }}
              >
                {stat.value}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }, []);
  return (
    <CrudPage
      schema={getAccountSchema()}
      apiAdapter={apiAdapter}
      customColumns={customColumns}
      headerContent={headerContent}
      breadcrumbs={[
        { label: i18n.t('admin.account_management_page.k32'), href: '/dashboard' },
        { label: i18n.t('admin.account_management_page.k33') },
        { label: i18n.t('admin.account_management_page.k34') },
      ]}
    />
  );
};
export default AccountManagementPage;
