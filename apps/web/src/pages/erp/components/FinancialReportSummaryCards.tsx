import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Activity,
  Building2,
} from 'lucide-react';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/api/erp/types';

interface FinancialReportSummaryCardsProps {
  activeTab: string;
  balanceSheet: BalanceSheet | null;
  incomeStatement: IncomeStatement | null;
  cashFlowStatement: CashFlowStatement | null;
  formatCurrency: (amount: number) => string;
}

interface SummaryCardConfig {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

const SummaryCard: React.FC<{ config: SummaryCardConfig }> = ({ config }) => {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: config.iconBg }}>
          <Box sx={{ width: 24, height: 24, color: config.iconColor, display: 'flex' }}>
            {config.icon}
          </Box>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {config.label}
          </Typography>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', color: config.valueColor }}
          >
            {config.value}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export const FinancialReportSummaryCards: React.FC<FinancialReportSummaryCardsProps> = ({
  activeTab,
  balanceSheet,
  incomeStatement,
  cashFlowStatement,
  formatCurrency,
}) => {
  const { t } = useTranslation();

  if (activeTab === 'balance-sheet' && balanceSheet) {
    const cards: SummaryCardConfig[] = [
      {
        label: t('erp.financial_report.label.total_assets'),
        value: formatCurrency(balanceSheet.total_assets),
        icon: <DollarSign size={24} />,
        iconBg: 'primary.100',
        iconColor: 'primary.main',
      },
      {
        label: t('erp.financial_report.label.total_liabilities'),
        value: formatCurrency(balanceSheet.total_liabilities),
        icon: <TrendingDown size={24} />,
        iconBg: 'warning.100',
        iconColor: 'warning.main',
      },
      {
        label: t('erp.financial_report.label.total_equity'),
        value: formatCurrency(balanceSheet.total_equity),
        icon: <Wallet size={24} />,
        iconBg: 'success.100',
        iconColor: 'success.main',
      },
    ];
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, md: 3 }, gap: 2, mb: 3 }}>
        {cards.map((card) => (
          <SummaryCard
            key={card.label}
            config={card}
          />
        ))}
      </Box>
    );
  }

  if (activeTab === 'income-statement' && incomeStatement) {
    const totalRevenue = incomeStatement.revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalCost = incomeStatement.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfitPositive = incomeStatement.net_profit >= 0;

    const cards: SummaryCardConfig[] = [
      {
        label: t('erp.financial_report.label.total_revenue'),
        value: formatCurrency(totalRevenue),
        icon: <TrendingUp size={24} />,
        iconBg: 'success.100',
        iconColor: 'success.main',
      },
      {
        label: t('erp.financial_report.label.total_cost'),
        value: formatCurrency(totalCost),
        icon: <TrendingDown size={24} />,
        iconBg: 'error.100',
        iconColor: 'error.main',
      },
      {
        label: t('erp.financial_report.label.operating_profit'),
        value: formatCurrency(incomeStatement.operating_profit),
        icon: <BarChart3 size={24} />,
        iconBg: 'primary.100',
        iconColor: 'primary.main',
      },
      {
        label: t('erp.financial_report.label.net_profit'),
        value: formatCurrency(incomeStatement.net_profit),
        icon: <DollarSign size={24} />,
        iconBg: netProfitPositive ? 'success.100' : 'error.100',
        iconColor: netProfitPositive ? 'success.main' : 'error.main',
        valueColor: netProfitPositive ? 'success.main' : 'error.main',
      },
    ];
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, md: 4 }, gap: 2, mb: 3 }}>
        {cards.map((card) => (
          <SummaryCard
            key={card.label}
            config={card}
          />
        ))}
      </Box>
    );
  }

  if (activeTab === 'cash-flow' && cashFlowStatement) {
    const operating = cashFlowStatement.operating_activities.reduce((sum, i) => sum + i.amount, 0);
    const investing = cashFlowStatement.investing_activities.reduce((sum, i) => sum + i.amount, 0);
    const financing = cashFlowStatement.financing_activities.reduce((sum, i) => sum + i.amount, 0);
    const netPositive = cashFlowStatement.net_cash_flow >= 0;

    const cards: SummaryCardConfig[] = [
      {
        label: t('erp.financial_report.label.operating_cash_flow'),
        value: formatCurrency(operating),
        icon: <Activity size={24} />,
        iconBg: 'success.100',
        iconColor: 'success.main',
      },
      {
        label: t('erp.financial_report.label.investing_cash_flow'),
        value: formatCurrency(investing),
        icon: <Building2 size={24} />,
        iconBg: 'warning.100',
        iconColor: 'warning.main',
      },
      {
        label: t('erp.financial_report.label.financing_cash_flow'),
        value: formatCurrency(financing),
        icon: <DollarSign size={24} />,
        iconBg: 'primary.100',
        iconColor: 'primary.main',
      },
      {
        label: t('erp.financial_report.label.net_cash_flow'),
        value: formatCurrency(cashFlowStatement.net_cash_flow),
        icon: <Wallet size={24} />,
        iconBg: netPositive ? 'success.100' : 'error.100',
        iconColor: netPositive ? 'success.main' : 'error.main',
        valueColor: netPositive ? 'success.main' : 'error.main',
      },
    ];
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, md: 4 }, gap: 2, mb: 3 }}>
        {cards.map((card) => (
          <SummaryCard
            key={card.label}
            config={card}
          />
        ))}
      </Box>
    );
  }

  return null;
};
