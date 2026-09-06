/**
 * 预算管理页面
 *
 * 使用 CrudPage + budgetSchema 实现 schema 驱动的 CRUD。
 * 支持列表展示、创建、编辑、删除、筛选，以及批量更新状态和批量删除。
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  FormLabel,
} from '@mui/material';
import { TrendingUp, Trash2, DollarSign, Calendar, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { getBudgetSchema } from '@/schemas/finance/budget';
import { budgetApi } from '@/api/finance';
import type { Budget } from '@/api/finance';
import { departmentApi } from '@/api/hrm';
import type { Department } from '@/api/hrm';
import { BackButton, PageContainer } from '@/components/common';
import { StatCardGroup } from '@/components';
import { FINANCE_PATHS } from '@/modules/finance/config';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import type { EntitySchema, BatchActionConfig } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const BudgetManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [batchStatusTargetIds, setBatchStatusTargetIds] = useState<string[] | null>(null);
  const [batchStatusValue, setBatchStatusValue] = useState<string>('');

  // 加载部门列表，用于将 department_id 解析为部门名称
  const departmentsQuery = useQuery<Department[]>({
    queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_FOR_FINANCE_BUDGET_BASE,
    queryFn: async () => {
      const res = await departmentApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery]);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const page = (params?.page as number) || 1;
        const pageSize = (params?.pageSize as number) || 10;
        const search = (params?.search as string) || '';
        const statusFilter = (params?.status as string) || undefined;
        const budgetTypeFilter = (params?.budget_type as string) || undefined;

        const queryParams: Record<string, unknown> = {
          page,
          pagesize: pageSize,
        };
        if (search) queryParams.search = search;
        if (statusFilter && statusFilter !== 'all') queryParams.status = statusFilter;
        if (budgetTypeFilter && budgetTypeFilter !== 'all')
          queryParams.budget_type = budgetTypeFilter;

        const response = await budgetApi.list(queryParams as Parameters<typeof budgetApi.list>[0]);
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }

        const items = response.data.items || [];

        // 合并部门名称
        const merged = items.map((budget: Budget) => {
          const dept = departments.find((d) => d.id === budget.department_id);
          return {
            ...budget,
            _department_name: dept?.name || budget.department_id || '-',
          };
        });

        return {
          data: merged as unknown as Record<string, unknown>[],
          total: response.data.total || items.length,
        };
      },
      create: async (data) => {
        const response = await budgetApi.create(data as Partial<Budget>);
        if (!response.success) {
          throw new Error(response.message || t('finance.budget_management_page.create'));
        }
        addNotification({
          title: t('finance.budget_management_page.success'),
          message: t('finance.budget_management_page.create_1'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const response = await budgetApi.update(String(id), data as Partial<Budget>);
        if (!response.success) {
          throw new Error(response.message || t('finance.budget_management_page.update_4'));
        }
        addNotification({
          title: t('finance.budget_management_page.success'),
          message: t('finance.budget_management_page.update_5'),
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await budgetApi.delete(String(id));
        if (!response.success) {
          throw new Error(response.message || t('finance.budget_management_page.delete_1'));
        }
        addNotification({
          title: t('finance.budget_management_page.success'),
          message: t('finance.budget_management_page.delete_success'),
          type: 'success',
        });
      },
    }),
    [addNotification, t, departments]
  );

  const handleBatchUpdateStatus = useCallback((ids: string[]) => {
    setBatchStatusTargetIds(ids);
  }, []);

  const confirmBatchUpdateStatus = useCallback(async () => {
    if (!batchStatusTargetIds || !batchStatusValue) return;
    try {
      const promises = batchStatusTargetIds.map((id) =>
        budgetApi.update(id, { status: batchStatusValue })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      addNotification({
        title: t('finance.budget_management_page.update'),
        message: i18n.t('finance.budget_management_page.e1', {
          v1: successCount,
          v2: batchStatusTargetIds.length - successCount,
        }),
        type: 'success',
      });
      setBatchStatusTargetIds(null);
      setBatchStatusValue('');
    } catch (err) {
      addNotification({
        title: t('finance.budget_management_page.update_2'),
        message:
          (err as { message?: string }).message || t('finance.budget_management_page.update_3'),
        type: 'error',
      });
    }
  }, [batchStatusTargetIds, batchStatusValue, addNotification, t]);

  const handleBatchDelete = useCallback(
    async (ids: string[]) => {
      try {
        const promises = ids.map((id) => budgetApi.delete(id));
        const results = await Promise.all(promises);
        const successCount = results.filter((r) => r.success).length;
        addNotification({
          title: t('finance.budget_management_page.batch_delete'),
          message: i18n.t('finance.budget_management_page.e2', {
            v1: successCount,
            v2: ids.length - successCount,
          }),
          type: 'success',
        });
      } catch (err) {
        addNotification({
          title: t('finance.budget_management_page.batch_delete_1'),
          message:
            (err as { message?: string }).message ||
            t('finance.budget_management_page.batch_delete_1'),
          type: 'error',
        });
      }
    },
    [addNotification, t]
  );

  const batchActions: BatchActionConfig[] = useMemo(
    () => [
      {
        key: 'update_status',
        label: i18n.t('finance.budget_management_page.update_6'),
        icon: <Settings sx={{ width: 16, height: 16 }} />,
        onClick: (ids: string[]) => handleBatchUpdateStatus(ids),
      },
      {
        key: 'batch_delete',
        label: i18n.t('finance.budget_management_page.batch_delete_2'),
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: (ids: string[]) => handleBatchDelete(ids),
        confirm: true,
        confirmMessage: i18n.t('finance.budget_management_page.confirm_1'),
      },
    ],
    [handleBatchUpdateStatus, handleBatchDelete]
  );

  const schema = useMemo<EntitySchema>(() => {
    const baseBudgetSchema = getBudgetSchema();
    return {
      ...baseBudgetSchema,
      batchActions,
    };
  }, [batchActions]);

  const headerContent = useCallback(
    (rows: Record<string, unknown>[]) => {
      const budgets = rows as unknown as Budget[];
      const totalBudget = budgets.reduce((sum, b) => sum + (b.total_budget || 0), 0);
      const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount ?? 0), 0);
      const avgUsageRate =
        budgets.length > 0
          ? budgets.reduce((sum, b) => sum + (b.usage_rate ?? 0), 0) / budgets.length
          : 0;

      const statCards = [
        {
          title: t('finance.budget_management_page.text_b91eb1'),
          value: `¥${totalBudget.toLocaleString()}`,
          icon: <DollarSign size={24} />,
          color: 'primary' as const,
        },
        {
          title: t('finance.budget_management_page.text_b59b00'),
          value: `¥${totalUsed.toLocaleString()}`,
          icon: <TrendingUp size={24} />,
          color: 'success' as const,
        },
        {
          title: t('finance.budget_management_page.text_bf99c1'),
          value: `${avgUsageRate.toFixed(1)}%`,
          icon: <Calendar size={24} />,
          color: avgUsageRate > 80 ? ('error' as const) : ('warning' as const),
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
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BackButton href={FINANCE_PATHS.dashboard} />
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 700,
                    color: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <TrendingUp
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                    }}
                  />
                  {t('finance.budget_management_page.e3')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, color: 'grey.500' }}
                >
                  {t('finance.budget_management_page.e4')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ModeToggle />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <CrudPage
          schema={schema}
          apiAdapter={apiAdapter}
          headerContent={headerContent}
        />
      </Box>

      <Dialog
        open={!!batchStatusTargetIds}
        onClose={() => {
          setBatchStatusTargetIds(null);
          setBatchStatusValue('');
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('finance.budget_management_page.k0')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FormLabel htmlFor='batch_status'>{t('finance.budget_management_page.k1')}</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={batchStatusValue}
                  onChange={(e) => setBatchStatusValue(e.target.value)}
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    {t('finance.budget_management_page.e5')}
                  </MenuItem>
                  <MenuItem value='active'>{t('finance.budget_management_page.k2')}</MenuItem>
                  <MenuItem value='frozen'>{t('finance.budget_management_page.k3')}</MenuItem>
                  <MenuItem value='exhausted'>{t('finance.budget_management_page.k4')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              {t('finance.budget_management_page.r1', { v1: ' ' })}
              <Box
                component='span'
                sx={{ fontWeight: 600 }}
              >
                {batchStatusTargetIds?.length ?? 0}
              </Box>{' '}
              {t('finance.budget_management_page.e6')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ mt: 2 }}>
          <Button
            variant='outlined'
            onClick={() => {
              setBatchStatusTargetIds(null);
              setBatchStatusValue('');
            }}
          >
            {t('finance.budget_management_page.e7')}
          </Button>
          <Button
            variant='contained'
            onClick={confirmBatchUpdateStatus}
            disabled={!batchStatusValue}
          >
            {t('finance.budget_management_page.e8')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BudgetManagementPage;
