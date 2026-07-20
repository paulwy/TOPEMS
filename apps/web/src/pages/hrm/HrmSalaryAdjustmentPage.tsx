import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Box, Chip, Typography } from '@mui/material';
import { TrendingUp, Plus, TrendingDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { salaryAdjustmentApi } from '@/api/hrm';
import type { SalaryAdjustment } from '@/api/hrm';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
const HrmSalaryAdjustmentPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const adjustmentsQuery = useQuery<SalaryAdjustment[]>({
    queryKey: QUERY_KEYS.HRM.SALARY_ADJUSTMENT,
    queryFn: async () => {
      const res = await salaryAdjustmentApi.list({ page: 1, pagesize: 50 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const loading = adjustmentsQuery.isLoading;
  const adjustments = adjustmentsQuery.data || [];

  const loadAdjustments = () => {
    adjustmentsQuery.refetch();
  };

  const approveMutation = useMutation({
    mutationFn: async (args: { id: string; user: string }) =>
      salaryAdjustmentApi.approve(args.id, args.user),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_salary_adjustment_page.success'), type: 'success', message: t('hrm.hrm_salary_adjustment_page.text_c0b5ba') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.SALARY_ADJUSTMENT });
    },
    onError: () => {
      addNotification({ title: t('hrm.hrm_salary_adjustment_page.fail'), type: 'error', message: t('hrm.hrm_salary_adjustment_page.fail') });
    },
  });

  const getTypeChip = (type: string) => {
    const map: Record<
      string,
      { label: string; color: 'primary' | 'success' | 'warning' | 'default' }
    > = {
      promotion: { label: t('hrm.hrm_salary_adjustment_page.text_34714b'), color: 'primary' },
      demotion: { label: t('hrm.hrm_salary_adjustment_page.text_309ae8'), color: 'warning' },
      bonus: { label: t('hrm.hrm_salary_adjustment_page.text_01b5d0'), color: 'success' },
      deduction: { label: t('hrm.hrm_salary_adjustment_page.text_c6f803'), color: 'warning' },
      annual: { label: t('hrm.hrm_salary_adjustment_page.text_4d3b2a'), color: 'success' },
      special: { label: t('hrm.hrm_salary_adjustment_page.text_6b00d6'), color: 'warning' },
      correction: { label: t('hrm.hrm_salary_adjustment_page.text_f290f3'), color: 'default' },
    };
    const cfg = map[type] || { label: type, color: 'default' as const };
    return (
      <Chip
        label={cfg.label}
        color={cfg.color}
        size='small'
      />
    );
  };

  const getStatusChip = (status: string) => {
    const map: Record<
      string,
      { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }
    > = {
      approved: { label: t('hrm.hrm_salary_adjustment_page.text_337737'), color: 'success', icon: <CheckCircle size={14} /> },
      pending: { label: t('hrm.hrm_salary_adjustment_page.text_b0bf01'), color: 'warning', icon: <Clock size={14} /> },
      rejected: { label: t('hrm.hrm_salary_adjustment_page.text_81233d'), color: 'error', icon: <XCircle size={14} /> },
    };
    const cfg = map[status] || { label: status, color: 'default' as const, icon: null };
    return (
      <Chip
        label={cfg.label}
        color={cfg.color}
        size='small'
        icon={cfg.icon as unknown as React.ReactElement}
      />
    );
  };

  const columns: ColumnDef<SalaryAdjustment>[] = [
    {
      id: 'employee_name',
      label: t('hrm.hrm_salary_adjustment_page.text_2ed392'),
      width: 120,
    },
    {
      id: 'department',
      label: t('hrm.hrm_salary_adjustment_page.text_1e1459'),
      width: 120,
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
          noWrap
        >
          {row.department || '-'}
        </Typography>
      ),
    },
    {
      id: 'adjustment_type',
      label: t('hrm.hrm_salary_adjustment_page.type'),
      width: 120,
      render: (row) => getTypeChip(row.adjustment_type),
    },
    {
      id: 'old_salary',
      label: t('hrm.hrm_salary_adjustment_page.text_efcdf1'),
      width: 110,
      align: 'right',
      render: (row) => (
        <Typography variant='body2'>¥{Number(row.old_salary || 0).toLocaleString()}</Typography>
      ),
    },
    {
      id: 'new_salary',
      label: t('hrm.hrm_salary_adjustment_page.text_72ec23'),
      width: 110,
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 600 }}
        >
          ¥{Number(row.new_salary || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      id: 'adjustment_amount',
      label: t('hrm.hrm_salary_adjustment_page.text_34d019'),
      width: 140,
      align: 'right',
      render: (row: SalaryAdjustment) => {
        const amount = Number(row.adjustment_amount || 0);
        const oldSalary = Number(row.old_salary || 0);
        const percent = oldSalary > 0 ? (amount / oldSalary) * 100 : 0;
        const isPositive = amount >= 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            {isPositive ? (
              <TrendingUp
                size={14}
                color='success.main'
              />
            ) : (
              <TrendingDown
                size={14}
                color='error.main'
              />
            )}
            <Typography
              variant='body2'
              color={isPositive ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600 }}
            >
              {isPositive ? '+' : ''}¥{amount.toLocaleString()} ({percent.toFixed(1)}%)
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'effective_date',
      label: t('hrm.hrm_salary_adjustment_page.date'),
      width: 110,
      render: (row) => (
        <Typography variant='body2'>
          {row.effective_date ? new Date(row.effective_date).toLocaleDateString('zh-CN') : '-'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('hrm.hrm_salary_adjustment_page.status'),
      width: 100,
      render: (row) => getStatusChip(row.status),
    },
    {
      id: 'reason',
      label: t('hrm.hrm_salary_adjustment_page.text_41dfb0'),
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
          noWrap
        >
          {row.reason || '-'}
        </Typography>
      ),
    },
  ];

  const rowActions: RowAction<SalaryAdjustment>[] = [
    {
      label: t('hrm.hrm_salary_adjustment_page.view_detail'),
      icon: <TrendingUp size={16} />,
      onClick: (row) => {
        addNotification({
          title: t('hrm.hrm_salary_adjustment_page.detail'),
          type: 'info',
          message: `查看 ${row.employee_name} 的调薪详情`,
        });
      },
    },
    {
      label: t('hrm.hrm_salary_adjustment_page.text_0273ba'),
      icon: <CheckCircle size={16} />,
      onClick: (row) => {
        approveMutation.mutate({ id: row.id, user: 'current-user' });
      },
      show: (row) => row.status === 'pending',
    },
  ];

  return (
    <PageContainer
      title={t('hrm.hrm_salary_adjustment_page.text_56e426')}
      subtitle={t('hrm.hrm_salary_adjustment_page.text_cfb890')}
    >
      <ListPageTemplate<SalaryAdjustment>
        title=''
        subtitle=''
        columns={columns}
        data={adjustments}
        loading={loading}
        rowActions={rowActions}
        searchable
        onRefresh={loadAdjustments}
        exportable
        exportFileName={t('hrm.hrm_salary_adjustment_page.list')}
        persistFilters
        persistSearch
        emptyActionButton={{
          label: t('hrm.hrm_salary_adjustment_page.text_5781c0'),
          icon: <Plus size={16} />,
          onClick: () => {
            addNotification({ title: t('hrm.hrm_salary_adjustment_page.text_4c9a4a'), type: 'info', message: t('hrm.hrm_salary_adjustment_page.text_422aa5') });
          },
        }}
      />
    </PageContainer>
  );
};

export default HrmSalaryAdjustmentPage;
