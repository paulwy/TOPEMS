import React, { useState, useMemo, useCallback } from 'react';
import styles from './FinanceBudgetDetailPage.module.css';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
import { FINANCE_PATHS } from '@/module-configs/finance/config';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
} from '@mui/material';
import { PieChart, TrendingUp, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { budgetApi } from '@/api/finance';
import { useNotification } from '@/hooks/useNotification';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface BudgetDetail {
  id: string;
  name: string;
  type: string;
  fiscalYear: string;
  department: string;
  totalBudget: number;
  usedAmount: number;
  remainingAmount: number;
  usageRate: number;
  status: 'active' | 'completed' | 'frozen' | 'expired';
  createdAt: string;
  updatedAt: string;
}

const FinanceBudgetDetailPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { success } = useNotification();

  const [showAnalysis, setShowAnalysis] = useState(false);

  const budgetQuery = useQuery<BudgetDetail | null>({
    queryKey: [...QUERY_KEYS.FINANCE.BUDGET_DETAIL(id || '')],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error(t('finance.finance_budget_detail_page.error_no_id'));
      }

      const budgetRes = await budgetApi.get(id);

      if (!budgetRes.success || !budgetRes.data) {
        throw new Error(t('finance.finance_budget_detail_page.detail'));
      }

      const budgetData = budgetRes.data;
      // 后端金额/比率字段可能以 JSON 字符串返回，统一转 number
      const totalBudget = Number(budgetData.total_budget ?? 0);
      const usedAmount = Number(budgetData.used_amount ?? 0);
      const remainingAmount = Number(budgetData.remaining_amount ?? 0);

      return {
        id: budgetData.id ?? '',
        name: t('finance.finance_budget_detail_page.e1', {
          v1: budgetData.fiscal_year,
          v2: getBudgetTypeName(budgetData.budget_type || ''),
        }),
        type: budgetData.budget_type || '',
        fiscalYear: budgetData.fiscal_year || '',
        department: '-',
        totalBudget,
        usedAmount,
        remainingAmount,
        usageRate: Number(budgetData.usage_rate ?? 0),
        status: budgetData.status as BudgetDetail['status'],
        createdAt: budgetData.created_at ?? '',
        updatedAt: budgetData.updated_at ?? '',
      };
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const budget: BudgetDetail | null = budgetQuery.data ?? null;
  const loading = budgetQuery.isLoading;
  const errorMessage = budgetQuery.error
    ? t('finance.finance_budget_detail_page.detail_1')
    : undefined;

  const getBudgetTypeName = useCallback(
    (type: string) => {
      const labels: Record<string, string> = {
        operating: t('finance.finance_budget_detail_page.type_operating'),
        capital: t('finance.finance_budget_detail_page.type_capital'),
        project: t('finance.finance_budget_detail_page.type_project'),
        marketing: t('finance.finance_budget_detail_page.type_marketing'),
        personnel: t('finance.finance_budget_detail_page.type_personnel'),
        office: t('finance.finance_budget_detail_page.type_office'),
        development: t('finance.finance_budget_detail_page.type_development'),
        travel: t('finance.finance_budget_detail_page.type_travel_expense'),
        training: t('finance.finance_budget_detail_page.type_training'),
        other: t('finance.finance_budget_detail_page.other'),
      };
      return labels[type] || type;
    },
    [t]
  );

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const getStatusConfig = useCallback(
    (status: string) => {
      const config: Record<
        string,
        { color: 'success' | 'error' | 'default' | 'warning'; label: string }
      > = {
        active: { color: 'success', label: t('finance.finance_budget_detail_page.status_active') },
        completed: { color: 'warning', label: t('finance.finance_budget_detail_page.completed') },
        frozen: { color: 'default', label: t('finance.finance_budget_detail_page.status_frozen') },
        expired: { color: 'error', label: t('finance.finance_budget_detail_page.status_expired') },
      };
      return config[status] || config.active;
    },
    [t]
  );

  const handleExport = () => {
    success(t('finance.finance_budget_detail_page.export'));
  };

  const basicInfoContent = useMemo(() => {
    if (!budget) return null;
    const statusConfig = getStatusConfig(budget.status);
    return (
      <Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3, textAlign: 'center' }}>
            <DollarSign sx={{ width: 32, height: 32, color: 'primary.main', mb: 1 }} />
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              {formatCurrency(budget.totalBudget)}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_budget_detail_page.e2')}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3, textAlign: 'center' }}>
            <TrendingUp sx={{ width: 32, height: 32, color: 'warning.main', mb: 1 }} />
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold', color: 'warning.main' }}
            >
              {formatCurrency(budget.usedAmount)}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_budget_detail_page.e3')}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3, textAlign: 'center' }}>
            <CheckCircle2 sx={{ width: 32, height: 32, color: 'success.main', mb: 1 }} />
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold', color: 'success.main' }}
            >
              {formatCurrency(budget.remainingAmount)}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_budget_detail_page.e4')}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3, textAlign: 'center' }}>
            <Chip
              label={statusConfig.label}
              color={statusConfig.color}
              size='medium'
              sx={{ mb: 2 }}
            />
            <Box>
              <LinearProgress
                variant='determinate'
                value={budget.usageRate}
                sx={{ height: 8, borderRadius: 1, mb: 1 }}
              />
              <Typography variant='body2'>
                {t('finance.finance_budget_detail_page.l1')} <strong>{budget.usageRate}%</strong>
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('finance.finance_budget_detail_page.k1')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{getBudgetTypeName(budget.type)}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('finance.finance_budget_detail_page.k2')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {t('finance.finance_budget_detail_page.m1', { v1: budget.fiscalYear })}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('finance.finance_budget_detail_page.k3')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{budget.department}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('finance.finance_budget_detail_page.k4')}
            </InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('finance.finance_budget_detail_page.id_5')}
            </InputLabel>
            <Typography
              sx={{
                mt: 0.5,
                fontFamily: 'monospace',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {budget.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [budget, t, getBudgetTypeName, getStatusConfig]);

  const analysisContent = useMemo(() => {
    if (!budget) return null;
    return (
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}
      >
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_budget_detail_page.e7')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium' }}
            >
              50%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={50}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mt: 1, display: 'block' }}
          >
            {t('finance.finance_budget_detail_page.e8')}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_budget_detail_page.e9')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium' }}
            >
              {budget.usageRate}%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={budget.usageRate}
            color={budget.usageRate > 80 ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mt: 1, display: 'block' }}
          >
            {budget.usageRate > 80
              ? t('finance.finance_budget_detail_page.overrun_message')
              : t('finance.finance_budget_detail_page.normal_1')}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('finance.finance_budget_detail_page.e10')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium', color: 'success.main' }}
            >
              {formatCurrency(Math.max(0, budget.remainingAmount - budget.usedAmount * 0.1))}
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={65}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mt: 1, display: 'block' }}
          >
            {t('finance.finance_budget_detail_page.e11')}
          </Typography>
        </Box>
      </Box>
    );
  }, [budget, t]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: t('finance.finance_budget_detail_page.info'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'analysis',
        label: t('finance.finance_budget_detail_page.analysis'),
        content: analysisContent || <></>,
      },
    ],
    [basicInfoContent, analysisContent, t]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <DollarSign
          size={32}
          color={theme.palette.primary.dark}
        />
      ),
      title: budget?.name,
      tags: [budget?.fiscalYear ? t('finance.finance_budget_detail_page.e12') : ''],
      stats: [
        {
          label: i18n.t('finance.finance_budget_detail_page.stat_label_total_budget'),
          value: budget ? formatCurrency(budget.totalBudget) : '-',
        },
        {
          label: i18n.t('finance.finance_budget_detail_page.stat_label_used_amount'),
          value: budget ? formatCurrency(budget.usedAmount) : '-',
        },
        {
          label: i18n.t('finance.finance_budget_detail_page.stat_label_usage_rate'),
          value: budget ? `${budget.usageRate}%` : '-',
        },
      ],
    }),
    [budget, t]
  );

  return (
    <PageContainer
      title={t('finance.finance_budget_detail_page.detail_2')}
      subtitle={t('finance.finance_budget_detail_page.view')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={budget?.name || budget?.id || t('finance.finance_budget_detail_page.k13')}
        backHref={FINANCE_PATHS.budget}
        loading={loading}
        emptyState={{ show: !loading && !budget }}
        error={errorMessage}
        onDownload={handleExport}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: t('finance.finance_budget_detail_page.analysis'),
            icon: <PieChart className={styles.il1} />,
            variant: 'outlined',
            onClick: () => setShowAnalysis(true),
          },
        ]}
      />

      <Dialog
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <PieChart sx={{ width: 20, height: 20, mr: 1 }} />
          {t('finance.finance_budget_detail_page.e13')}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
              mb: 3,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <AlertCircle sx={{ width: 24, height: 24, color: 'warning.main', mb: 1 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 'bold' }}
              >
                {t('finance.finance_budget_detail_page.e14')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ mt: 1 }}
              >
                {t('finance.finance_budget_detail_page.e15')}
                {budget?.usageRate && budget.usageRate >= 80
                  ? t('finance.finance_budget_detail_page.usage_over_80')
                  : t('finance.finance_budget_detail_page.normal')}
                {t('finance.finance_budget_detail_page.e1')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <CheckCircle2 sx={{ width: 24, height: 24, color: 'success.main', mb: 1 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 'bold' }}
              >
                {t('finance.finance_budget_detail_page.e16')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ mt: 1 }}
              >
                {t('finance.finance_budget_detail_page.e17')}
              </Typography>
            </Box>
          </Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {t('finance.finance_budget_detail_page.e18')}
          </Typography>
          <Box
            component='ul'
            sx={{ pl: 2 }}
          >
            <li>
              <Typography variant='body2'>{t('finance.finance_budget_detail_page.l2')}</Typography>
            </li>
            <li>
              <Typography variant='body2'>{t('finance.finance_budget_detail_page.l3')}</Typography>
            </li>
            <li>
              <Typography variant='body2'>{t('finance.finance_budget_detail_page.l4')}</Typography>
            </li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>
            {t('finance.finance_budget_detail_page.k14')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceBudgetDetailPage;
