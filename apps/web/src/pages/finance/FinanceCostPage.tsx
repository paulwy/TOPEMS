/**
 * 成本管理页面
 *
 * 使用 CrudPage + costSchema 实现 schema 驱动的 CRUD。
 * 支持列表展示、创建、编辑、删除、筛选，以及余额展示和成本分析。
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import { TrendingUp, Wallet, DollarSign, BarChart3, Download } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { costSchema } from '@/schemas/finance/cost';
import { accountApi } from '@/api/finance/account';
import type { Account, AccountBalance } from '@/types/finance';
import { BackButton, PageContainer } from '@/components/common';
import { StatCardGroup } from '@/components';
import { FINANCE_PATHS } from '@/modules/finance/config';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const FinanceCostPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [analysisTarget, setAnalysisTarget] = useState<Account | null>(null);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const page = (params?.page as number) || 1;
        const pageSize = (params?.pageSize as number) || 10;
        const search = (params?.search as string) || '';
        const statusFilter = (params?.status as string) || undefined;

        const queryParams: Record<string, unknown> = {
          category: 'cost',
          page,
          pagesize: pageSize,
        };
        if (search) queryParams.keyword = search;
        if (statusFilter && statusFilter !== 'all') queryParams.status = statusFilter;

        const response = await accountApi.list(queryParams);
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }

        const accounts = response.data.items || [];

        // 获取余额数据并合并
        let balances: AccountBalance[] = [];
        try {
          const period = new Date().toISOString().slice(0, 7);
          const balanceResp = await accountApi.getBalances({ period });
          if (balanceResp.success && balanceResp.data) {
            balances = balanceResp.data.filter((b) => b.category === 'cost');
          }
        } catch {
          // 余额获取失败不阻塞列表
        }

        const merged = accounts.map((account: Account) => {
          const balance = balances.find((b) => b.account_id === account.id);
          return {
            ...account,
            debit_balance: balance?.debit_balance ?? 0,
            period_debit: balance?.period_debit ?? 0,
            period_credit: balance?.period_credit ?? 0,
          };
        });

        return {
          data: merged as unknown as Record<string, unknown>[],
          total: response.data.total || accounts.length,
        };
      },
      create: async (data) => {
        const payload = { ...(data as Partial<Account>), category: 'cost' as const };
        const response = await accountApi.create(payload);
        if (!response.success) {
          throw new Error(response.message || t('finance.finance_cost_page.k0'));
        }
        addNotification({
          title: t('finance.finance_cost_page.text_7f9f6f'),
          message: t('finance.finance_cost_page.k1'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const response = await accountApi.update(String(id), data as Partial<Account>);
        if (!response.success) {
          throw new Error(response.message || t('finance.finance_cost_page.k2'));
        }
        addNotification({
          title: t('finance.finance_cost_page.text_7f9f6f'),
          message: t('finance.finance_cost_page.k3'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await accountApi.delete(String(id));
        if (!response.success) {
          throw new Error(response.message || t('finance.finance_cost_page.k4'));
        }
        addNotification({
          title: t('finance.finance_cost_page.text_7f9f6f'),
          message: t('finance.finance_cost_page.k5'),
          type: 'success',
        });
      },
    }),
    [addNotification, t]
  );

  const handleExport = useCallback(() => {
    addNotification({
      title: t('finance.finance_cost_page.export'),
      message: t('finance.finance_cost_page.export_1'),
      type: 'success',
    });
  }, [addNotification, t]);

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('finance.finance_cost_page.text_7f9f6f'),
        icon: <BarChart3 size={16} />,
        color: 'success',
        onClick: (row) => setAnalysisTarget(row as unknown as Account),
      },
    ],
    [t]
  );

  const headerContent = useCallback(
    (rows: Record<string, unknown>[]) => {
      const totalActual = rows.reduce((sum, r) => sum + (Number(r.debit_balance) || 0), 0);
      const totalPeriodDebit = rows.reduce((sum, r) => sum + (Number(r.period_debit) || 0), 0);

      const statCards = [
        {
          title: t('finance.finance_cost_page.text_27d98b'),
          value: rows.length,
          icon: <Wallet size={24} />,
          color: 'primary' as const,
        },
        {
          title: t('finance.finance_cost_page.actual'),
          value: `¥${totalActual.toLocaleString()}`,
          icon: <DollarSign size={24} />,
          color: 'secondary' as const,
        },
        {
          title: t('finance.finance_cost_page.text_2058a6'),
          value: `¥${totalPeriodDebit.toLocaleString()}`,
          icon: <TrendingUp size={24} />,
          color: 'success' as const,
        },
      ];

      return (
        <StatCardGroup
          stats={statCards}
          columns={3}
        />
      );
    },
    [t]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('finance.finance_cost_page.text_86194f')}
      subtitle={t('finance.finance_cost_page.text_319c67')}
      autoTitle
      autoBreadcrumbs
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center' }}
              spacing={2}
            >
              <BackButton href={FINANCE_PATHS.dashboard} />
              <Box>
                <Typography
                  variant='h5'
                  sx={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}
                >
                  <Box
                    component='span'
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <TrendingUp size={28} />
                  </Box>
                  {t('finance.finance_cost_page.e1')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_cost_page.e2')}
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                variant='outlined'
                startIcon={<Download size={20} />}
                onClick={handleExport}
              >
                {t('finance.finance_cost_page.e3')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <CrudPage
          schema={costSchema}
          apiAdapter={apiAdapter}
          customRowActions={customRowActions}
          headerContent={headerContent}
        />
      </Box>

      <Dialog
        open={!!analysisTarget}
        onClose={() => setAnalysisTarget(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.finance_cost_page.r1', { v1: analysisTarget?.name })}</DialogTitle>
        <DialogContent>
          {analysisTarget && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_asset_page.e7')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {analysisTarget.code}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_cost_page.e5')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {analysisTarget.name}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_cost_page.e6')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700 }}
                >
                  ¥
                  {Number(
                    (analysisTarget as unknown as Record<string, unknown>).debit_balance || 0
                  ).toLocaleString()}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_cost_page.e7')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥
                    {Number(
                      (analysisTarget as unknown as Record<string, unknown>).period_debit || 0
                    ).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_cost_page.e8')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    ¥
                    {Number(
                      (analysisTarget as unknown as Record<string, unknown>).period_credit || 0
                    ).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              {analysisTarget.description && (
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('finance.finance_cost_page.e9')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 1 }}
                  >
                    {analysisTarget.description}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisTarget(null)}>
            {t('finance.finance_cost_page.k6')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceCostPage;
