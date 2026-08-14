/**
 * 资产管理页面
 *
 * 使用 CrudPage + assetSchema 实现 schema 驱动的 CRUD。
 * 支持列表展示、创建、编辑、删除、筛选，以及计提折旧和停用操作。
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
import {
  Download,
  Calculator,
  AlertTriangle,
  Package,
  CheckCircle,
  PauseCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { ConfirmDialog } from '@topems/shared-components';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { assetSchema } from '@/schemas/finance/asset';
import { accountApi } from '@/api/finance/account';
import { financeApi } from '@/api/finance';
import type { Account } from '@/types/finance';
import { BackButton, PageContainer } from '@/components/common';
import { StatCardGroup } from '@/components';
import { FINANCE_PATHS } from '@/modules/finance/config';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { apiLogger } from '@/utils/logger';
import i18n from '@/i18n';

const FinanceAssetPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [depreciationTarget, setDepreciationTarget] = useState<Account | null>(null);
  const [disableTarget, setDisableTarget] = useState<Account | null>(null);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const page = (params?.page as number) || 1;
        const pageSize = (params?.pageSize as number) || 10;
        const search = (params?.search as string) || '';
        const statusFilter = (params?.status as string) || undefined;

        const queryParams: Record<string, unknown> = {
          category: 'asset',
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
        return {
          data: accounts as unknown as Record<string, unknown>[],
          total: response.data.total || accounts.length,
        };
      },
      create: async (data) => {
        const payload = { ...(data as Partial<Account>), category: 'asset' as const };
        const response = await accountApi.create(payload);
        if (!response.success) {
          throw new Error(response.message || t('finance.finance_asset_page.k0'));
        }
        addNotification({
          title: t('finance.finance_asset_page.success'),
          message: t('finance.finance_asset_page.add_success'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const response = await accountApi.update(String(id), data as Partial<Account>);
        if (!response.success) {
          throw new Error(response.message || t('finance.finance_asset_page.k1'));
        }
        addNotification({
          title: t('finance.finance_asset_page.success'),
          message: t('finance.finance_asset_page.update_1'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await accountApi.delete(String(id));
        if (!response.success) {
          throw new Error(response.message || t('finance.finance_asset_page.k2'));
        }
        addNotification({
          title: t('finance.finance_asset_page.success'),
          message: t('finance.finance_asset_page.delete_success'),
          type: 'success',
        });
      },
    }),
    [addNotification, t]
  );

  const handleDepreciation = useCallback(
    async (asset: Account) => {
      try {
        const currentPeriod = new Date().toISOString().slice(0, 7);
        const response = await financeApi.voucher.create({
          voucher_date: new Date().toISOString().split('T')[0],
          period: currentPeriod,
          summary: t('finance.finance_asset_page.e1', { v1: asset.name }),
          entries: [
            {
              account_id: '1602',
              subject_code: '1602',
              subject_name: t('finance.finance_asset_page.text_d32915'),
              debit_amount: 1000,
              summary: t('finance.finance_asset_page.text_bca84a'),
            },
            {
              account_id: asset.id,
              subject_code: asset.code || '',
              subject_name: asset.name || '',
              credit_amount: 1000,
              summary: t('finance.finance_asset_page.text_d32915'),
            },
          ],
        });
        if (!response.success) {
          throw new Error(t('finance.finance_asset_page.fail_3'));
        }
        addNotification({
          title: t('finance.finance_asset_page.success'),
          message: t('finance.finance_asset_page.create_2'),
          type: 'success',
        });
        setDepreciationTarget(null);
      } catch (err) {
        apiLogger.error(t('finance.finance_asset_page.fail_4'), err);
        addNotification({
          title: t('finance.finance_asset_page.error'),
          message: t('finance.finance_asset_page.fail_3'),
          type: 'error',
        });
      }
    },
    [addNotification, t]
  );

  const handleDisable = useCallback(
    async (asset: Account) => {
      try {
        const response = await accountApi.update(asset.id, { ...asset, status: 'disabled' });
        if (!response.success) {
          throw new Error(t('finance.finance_asset_page.fail_1'));
        }
        addNotification({
          title: t('finance.finance_asset_page.success'),
          message: i18n.t('finance.finance_asset_page.e2', { v1: asset.name }),
          type: 'success',
        });
        setDisableTarget(null);
      } catch (err) {
        apiLogger.error(t('finance.finance_asset_page.fail_2'), err);
        addNotification({
          title: t('finance.finance_asset_page.error'),
          message: t('finance.finance_asset_page.fail_1'),
          type: 'error',
        });
      }
    },
    [addNotification, t]
  );

  const handleExport = useCallback(() => {
    addNotification({
      title: t('finance.finance_asset_page.export'),
      message: t('finance.finance_asset_page.export_1'),
      type: 'success',
    });
  }, [addNotification, t]);

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('finance.finance_asset_page.text_bca84a'),
        icon: <Calculator sx={{ width: 16, height: 16 }} />,
        color: 'success',
        onClick: (row) => setDepreciationTarget(row as unknown as Account),
      },
      {
        label: i18n.t('finance.finance_asset_page.inactive'),
        icon: <AlertTriangle sx={{ width: 16, height: 16 }} />,
        color: 'warning',
        onClick: (row) => setDisableTarget(row as unknown as Account),
      },
    ],
    [t]
  );

  const headerContent = useCallback(
    (rows: Record<string, unknown>[]) => {
      const totalCount = rows.length;
      const activeCount = rows.filter((a) => a.status === 'active').length;
      const disabledCount = rows.filter((a) => a.status === 'disabled').length;
      const hasChildrenCount = rows.filter((a) => a.haschildren).length;
      const leafCount = rows.filter((a) => !a.haschildren).length;
      const maxLevel = rows.length > 0 ? Math.max(...rows.map((a) => Number(a.level) || 0)) : 0;

      const statCards = [
        {
          title: t('finance.finance_asset_page.text_2d49ee'),
          value: totalCount,
          icon: <Package size={24} />,
          color: 'primary' as const,
        },
        {
          title: t('finance.finance_asset_page.active'),
          value: activeCount,
          icon: <CheckCircle size={24} />,
          color: 'success' as const,
        },
        {
          title: t('finance.finance_asset_page.inactive'),
          value: disabledCount,
          icon: <XCircle size={24} />,
          color: 'error' as const,
        },
        {
          title: t('finance.finance_asset_page.text_e18d32'),
          value: hasChildrenCount,
          icon: <PauseCircle size={24} />,
          color: 'warning' as const,
        },
        {
          title: t('finance.finance_asset_page.text_7586c1'),
          value: leafCount,
          icon: <DollarSign size={24} />,
          color: 'secondary' as const,
        },
        {
          title: t('finance.finance_asset_page.text_b1e385'),
          value: maxLevel,
          icon: <DollarSign size={24} />,
          color: 'info' as const,
        },
      ];

      return (
        <StatCardGroup
          stats={statCards}
          columns={6}
        />
      );
    },
    [t]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
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
                    <Calculator size={28} />
                  </Box>
                  {t('finance.finance_asset_page.e3')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_asset_page.e4')}
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
                {t('finance.finance_asset_page.e5')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <CrudPage
          schema={assetSchema}
          apiAdapter={apiAdapter}
          customRowActions={customRowActions}
          headerContent={headerContent}
        />
      </Box>

      <Dialog
        open={!!depreciationTarget}
        onClose={() => setDepreciationTarget(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.finance_asset_page.k3')}</DialogTitle>
        <DialogContent>
          {depreciationTarget && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_asset_page.e6')}
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {depreciationTarget.name}
                </Typography>
              </Box>
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
                  {depreciationTarget.code}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('finance.finance_asset_page.e8')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'success.main' }}
                >
                  ¥1,000.00
                </Typography>
              </Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('finance.finance_asset_page.e9')}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepreciationTarget(null)}>
            {t('finance.finance_asset_page.k4')}
          </Button>
          <Button
            variant='contained'
            color='success'
            onClick={() => depreciationTarget && handleDepreciation(depreciationTarget)}
          >
            {t('finance.finance_asset_page.e10')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => {
          if (disableTarget) handleDisable(disableTarget);
        }}
        title={t('finance.finance_asset_page.inactive_2')}
        message={t('finance.finance_asset_page.e11', { v1: disableTarget?.name })}
        type='warning'
        confirmLabel={t('finance.finance_asset_page.inactive')}
        cancelLabel={t('finance.finance_asset_page.cancel')}
      />
    </PageContainer>
  );
};

export default FinanceAssetPage;
