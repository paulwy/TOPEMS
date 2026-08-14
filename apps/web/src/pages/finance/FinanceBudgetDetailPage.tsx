import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
import { FINANCE_PATHS } from '@/modules/finance/config';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { PieChart, TrendingUp, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { budgetApi } from '@/api/erp';
import { financeApi } from '@/api/finance';
import type { AccountBalance } from '@/types/finance';
import { useNotification } from '@/hooks/useNotification';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

interface BudgetItem {
  id: string;
  subject: string;
  category: string;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usageRate: number;
}

interface BudgetDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  fiscalYear: string;
  department: string;
  totalBudget: number;
  usedAmount: number;
  remainingAmount: number;
  usageRate: number;
  status: 'active' | 'completed' | 'frozen' | 'expired';
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
}

const FinanceBudgetDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { success } = useNotification();

  const [showAnalysis, setShowAnalysis] = useState(false);

  const budgetQuery = useQuery<BudgetDetail | null>({
    queryKey: [...QUERY_KEYS.FINANCE.BUDGET_DETAIL(id || '')],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error(t('finance.finance_budget_detail_page.text_dba109'));
      }

      const [budgetRes, periodRes] = await Promise.all([
        budgetApi.get(id),
        financeApi.period.getCurrent(),
      ]);

      if (!budgetRes.success || !budgetRes.data) {
        throw new Error(t('finance.finance_budget_detail_page.detail'));
      }

      const budgetData = budgetRes.data;
      let items: BudgetItem[] = [];

      if (periodRes.success && periodRes.data) {
        const balancesRes = await financeApi.account.getBalances({
          period: periodRes.data.period,
        });
        if (balancesRes.success && balancesRes.data) {
          items = balancesRes.data.slice(0, 5).map((balance: AccountBalance, index: number) => ({
            id: balance.account_id || `item-${index}`,
            subject: balance.account_name,
            category: getCategoryLabel(balance.category),
            budgetAmount: Math.abs(balance.debit_balance + balance.credit_balance) || 1000000,
            usedAmount: balance.period_debit || 0,
            remainingAmount: Math.max(
              0,
              (Math.abs(balance.debit_balance + balance.credit_balance) || 1000000) -
                (balance.period_debit || 0)
            ),
            usageRate:
              balance.period_debit > 0
                ? Math.min(
                    100,
                    (balance.period_debit /
                      (Math.abs(balance.debit_balance + balance.credit_balance) || 1000000)) *
                      100
                  )
                : 0,
          }));
        }
      }

      const totalUsed = items.reduce((sum, item) => sum + item.usedAmount, 0);
      const totalRemaining = budgetData.total_budget - totalUsed;
      const usageRate =
        budgetData.total_budget > 0 ? (totalUsed / budgetData.total_budget) * 100 : 0;

      return {
        id: budgetData.id,
        code: `BUD-${budgetData.fiscal_year}-${budgetData.id.slice(-3).toUpperCase()}`,
        name: t('finance.finance_budget_detail_page.e1', {
          v1: budgetData.fiscal_year,
          v2: getBudgetTypeName(budgetData.budget_type || ''),
        }),
        type: budgetData.budget_type || '',
        fiscalYear: budgetData.fiscal_year || '',
        department: '-',
        totalBudget: budgetData.total_budget,
        usedAmount: totalUsed,
        remainingAmount: totalRemaining,
        usageRate: Math.round(usageRate * 100) / 100,
        status: budgetData.status as BudgetDetail['status'],
        items,
        createdAt: budgetData.created_at,
        updatedAt: budgetData.updated_at,
      };
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const budget = budgetQuery.data ?? null;
  const loading = budgetQuery.isLoading;
  const errorMessage = budgetQuery.error
    ? t('finance.finance_budget_detail_page.detail_1')
    : undefined;

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      asset: t('finance.finance_budget_detail_page.text_8b786a'),
      liability: t('finance.finance_budget_detail_page.text_299422'),
      equity: t('finance.finance_budget_detail_page.text_17a475'),
      cost: t('finance.finance_budget_detail_page.text_5a2da5'),
      expense: t('finance.finance_budget_detail_page.text_239f3a'),
      income: t('finance.finance_budget_detail_page.text_ef2827'),
    };
    return labels[category || ''] || t('finance.finance_budget_detail_page.other');
  };

  const getBudgetTypeName = (type: string) => {
    const labels: Record<string, string> = {
      operating: t('finance.finance_budget_detail_page.text_e9e771'),
      capital: t('finance.finance_budget_detail_page.text_2fc835'),
      project: t('finance.finance_budget_detail_page.text_fa2986'),
      marketing: t('finance.finance_budget_detail_page.text_fb0bc4'),
      personnel: t('finance.finance_budget_detail_page.text_859388'),
      office: t('finance.finance_budget_detail_page.text_976cad'),
      development: t('finance.finance_budget_detail_page.text_6d566d'),
      travel: t('finance.finance_budget_detail_page.text_2038cb'),
      training: t('finance.finance_budget_detail_page.text_b11633'),
      other: t('finance.finance_budget_detail_page.other'),
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { color: 'success' | 'error' | 'default' | 'warning'; label: string }
    > = {
      active: { color: 'success', label: t('finance.finance_budget_detail_page.text_46e386') },
      completed: { color: 'warning', label: t('finance.finance_budget_detail_page.completed') },
      frozen: { color: 'default', label: t('finance.finance_budget_detail_page.text_92cff4') },
      expired: { color: 'error', label: t('finance.finance_budget_detail_page.text_4d5ccd') },
    };
    return config[status] || config.active;
  };

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
                {t('finance.finance_budget_detail_page.l1')}{' '}<strong>{budget.usageRate}%</strong>
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
              {t('finance.finance_budget_detail_page.k0')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>{budget.code}</Typography>
          </Box>
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
            <Typography sx={{ mt: 0.5 }}>{t('finance.finance_budget_detail_page.m1', { v1: budget.fiscalYear })}</Typography>
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
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {budget.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [budget]);

  const itemsContent = useMemo(() => {
    if (!budget) return null;
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('finance.finance_budget_detail_page.e5')}
          </Typography>
          <Chip
            label={t('finance.finance_budget_detail_page.e6', { v1: budget.items.length })}
            size='small'
            variant='outlined'
          />
        </Box>
        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('finance.finance_budget_detail_page.k6')}</TableCell>
                <TableCell>{i18n.t('finance.finance_budget_detail_page.k7')}</TableCell>
                <TableCell align='right'>
                  {i18n.t('finance.finance_budget_detail_page.k8')}
                </TableCell>
                <TableCell align='right'>
                  {i18n.t('finance.finance_budget_detail_page.k9')}
                </TableCell>
                <TableCell align='right'>
                  {i18n.t('finance.finance_budget_detail_page.k10')}
                </TableCell>
                <TableCell>{i18n.t('finance.finance_budget_detail_page.k11')}</TableCell>
                <TableCell>{i18n.t('finance.finance_budget_detail_page.k12')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budget.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'medium' }}>{item.subject}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.category}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(item.budgetAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography color='warning.main'>{formatCurrency(item.usedAmount)}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography color='success.main'>
                      {formatCurrency(item.remainingAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, maxWidth: 80 }}>
                        <LinearProgress
                          variant='determinate'
                          value={item.usageRate}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ width: 40 }}
                      >
                        {item.usageRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.usageRate >= 80 ? (
                      <Chip
                        label={t('finance.finance_budget_detail_page.text_a9d127')}
                        size='small'
                        color='error'
                      />
                    ) : item.usageRate >= 60 ? (
                      <Chip
                        label={t('finance.finance_budget_detail_page.normal')}
                        size='small'
                        color='success'
                      />
                    ) : (
                      <Chip
                        label={t('finance.finance_budget_detail_page.text_69bb0e')}
                        size='small'
                        color='warning'
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }, [budget]);

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
              ? t('finance.finance_budget_detail_page.text_88bb52')
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
  }, [budget]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: t('finance.finance_budget_detail_page.info'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'items',
        label: t('finance.finance_budget_detail_page.text_ffaebd'),
        content: itemsContent || <></>,
      },
      {
        id: 'analysis',
        label: t('finance.finance_budget_detail_page.text_986695'),
        content: analysisContent || <></>,
      },
    ],
    [basicInfoContent, itemsContent, analysisContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <DollarSign
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: budget?.name,
      subtitle: budget?.code || undefined,
      tags: [budget?.fiscalYear ? t('finance.finance_budget_detail_page.e12') : ''],
      stats: [
        {
          label: i18n.t('finance.finance_budget_detail_page.text_b91eb1'),
          value: budget ? formatCurrency(budget.totalBudget) : '-',
        },
        {
          label: i18n.t('finance.finance_budget_detail_page.text_b59b00'),
          value: budget ? formatCurrency(budget.usedAmount) : '-',
        },
        {
          label: i18n.t('finance.finance_budget_detail_page.text_41d8b2'),
          value: budget ? `${budget.usageRate}%` : '-',
        },
      ],
    }),
    [budget]
  );

  return (
    <PageContainer
      title={t('finance.finance_budget_detail_page.detail_2')}
      subtitle={t('finance.finance_budget_detail_page.view')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          budget?.name || budget?.code || budget?.id || t('finance.finance_budget_detail_page.k13')
        }
        backHref={FINANCE_PATHS.budget}
        loading={loading}
        error={errorMessage}
        onDownload={handleExport}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: t('finance.finance_budget_detail_page.text_986695'),
            icon: <PieChart style={{ width: 18, height: 18 }} />,
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
                  ? t('finance.finance_budget_detail_page.text_6233c5')
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
