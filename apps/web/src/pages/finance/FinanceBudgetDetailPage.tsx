import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
        name: `${budgetData.fiscal_year}年度${getBudgetTypeName(budgetData.budget_type || '')}`,
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
              总预算
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
              已使用
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
              剩余预算
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
                使用率: <strong>{budget.usageRate}%</strong>
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
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>预算编号</InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>{budget.code}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>预算类型</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{getBudgetTypeName(budget.type)}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>所属年度</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{budget.fiscalYear}年度</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>所属部门</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{budget.department}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>预算状态</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>预算ID</InputLabel>
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
            预算科目明细
          </Typography>
          <Chip
            label={`共 ${budget.items.length} 个科目`}
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
                <TableCell>科目名称</TableCell>
                <TableCell>科目类别</TableCell>
                <TableCell align='right'>预算金额</TableCell>
                <TableCell align='right'>已使用</TableCell>
                <TableCell align='right'>剩余</TableCell>
                <TableCell>执行进度</TableCell>
                <TableCell>状态</TableCell>
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
              时间进度
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
            已过半年，预算执行正常
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              预算执行
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
              预测年底剩余
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
            预计年末有结余
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
      tags: [budget?.fiscalYear ? `${budget.fiscalYear}年度` : ''],
      stats: [
        {
          label: t('finance.finance_budget_detail_page.text_b91eb1'),
          value: budget ? formatCurrency(budget.totalBudget) : '-',
        },
        {
          label: t('finance.finance_budget_detail_page.text_b59b00'),
          value: budget ? formatCurrency(budget.usedAmount) : '-',
        },
        {
          label: t('finance.finance_budget_detail_page.text_41d8b2'),
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
        detailItemName={budget?.name || budget?.code || budget?.id || '预算详情'}
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
          预算执行分析
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
                执行提醒
              </Typography>
              <Typography
                variant='body2'
                sx={{ mt: 1 }}
              >
                当前预算使用率
                {budget?.usageRate && budget.usageRate >= 80
                  ? t('finance.finance_budget_detail_page.text_6233c5')
                  : t('finance.finance_budget_detail_page.normal')}
                ，请关注后续支出情况。
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <CheckCircle2 sx={{ width: 24, height: 24, color: 'success.main', mb: 1 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 'bold' }}
              >
                正向指标
              </Typography>
              <Typography
                variant='body2'
                sx={{ mt: 1 }}
              >
                预算执行情况良好，剩余预算充足。
              </Typography>
            </Box>
          </Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            调整建议
          </Typography>
          <Box
            component='ul'
            sx={{ pl: 2 }}
          >
            <li>
              <Typography variant='body2'>• 根据预算执行情况合理安排后续支出</Typography>
            </li>
            <li>
              <Typography variant='body2'>• 关注使用率较高的科目，必要时调整预算分配</Typography>
            </li>
            <li>
              <Typography variant='body2'>• 定期进行预算执行分析，及时发现问题</Typography>
            </li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceBudgetDetailPage;
