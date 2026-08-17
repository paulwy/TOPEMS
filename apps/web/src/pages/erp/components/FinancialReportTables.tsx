import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import i18n from '@/i18n';
import { FileText } from 'lucide-react';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  BalanceItem,
  IncomeItem,
  CashFlowItem,
} from '@/api/erp/types';

interface FinancialReportTablesProps {
  activeTab: string;
  balanceSheet: BalanceSheet | null;
  incomeStatement: IncomeStatement | null;
  cashFlowStatement: CashFlowStatement | null;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}
const LoadingState: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
    <CircularProgress />
  </Box>
);
const EmptyEquityChange: React.FC = () => {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <FileText sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }} />
      <Typography
        variant='body1'
        sx={{ color: 'text.secondary' }}
      >
        {i18n.t('erp.financial_report.label.equity_change_loading')}
      </Typography>
    </Box>
  );
};
const SectionHeader: React.FC<{ label: string; bgColor: string; colSpan: number }> = ({
  label,
  bgColor,
  colSpan,
}) => (
  <TableRow>
    <TableCell
      colSpan={colSpan}
      sx={{ bgcolor: bgColor, fontWeight: 'bold' }}
    >
      {label}
    </TableCell>
  </TableRow>
);
const BalanceSheetTable: React.FC<{
  data: BalanceSheet;
  formatCurrency: (amount: number) => string;
}> = ({ data, formatCurrency }) => {
  const renderSection = (items: BalanceItem[], prefix: string, sectionBg: string) => (
    <>
      <SectionHeader
        label={
          prefix === 'asset'
            ? i18n.t('erp.financial_report.label.assets')
            : prefix === 'liability'
              ? i18n.t('erp.financial_report.label.liabilities')
              : i18n.t('erp.financial_report.label.equity')
        }
        bgColor={sectionBg}
        colSpan={4}
      />
      {items.map((item) => (
        <TableRow
          key={`${prefix}-${item.code}`}
          hover
        >
          <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
          <TableCell>{item.name}</TableCell>
          <TableCell align='right'>{formatCurrency(item.amount)}</TableCell>
          <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
        </TableRow>
      ))}
    </>
  );
  return (
    <TableContainer
      component={Paper}
      sx={{ boxShadow: 1 }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
              {i18n.t('erp.financial_report.label.item_code')}
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>
              {i18n.t('erp.financial_report.label.item')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold', width: 180 }}
            >
              {i18n.t('erp.financial_report.label.amount')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold', width: 120 }}
            >
              {i18n.t('erp.financial_report.label.percentage')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {renderSection(data.assets, 'asset', 'primary.50')}
          {renderSection(data.liabilities, 'liability', 'warning.50')}
          {renderSection(data.equity, 'equity', 'success.50')}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
const IncomeStatementTable: React.FC<{
  data: IncomeStatement;
  formatCurrency: (amount: number) => string;
}> = ({ data, formatCurrency }) => {
  return (
    <TableContainer
      component={Paper}
      sx={{ boxShadow: 1 }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
              {i18n.t('erp.financial_report.label.item_code')}
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>
              {i18n.t('erp.financial_report.label.item')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold', width: 180 }}
            >
              {i18n.t('erp.financial_report.label.amount')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold', width: 120 }}
            >
              {i18n.t('erp.financial_report.label.percentage')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <SectionHeader
            label={i18n.t('erp.financial_report.label.revenue')}
            bgColor='success.50'
            colSpan={4}
          />
          {data.revenues.map((item: IncomeItem) => (
            <TableRow
              key={`revenue-${item.code}`}
              hover
            >
              <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell
                align='right'
                sx={{ color: 'success.main' }}
              >
                {formatCurrency(item.amount)}
              </TableCell>
              <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <SectionHeader
            label={i18n.t('erp.financial_report.label.operating_cost_and_expenses')}
            bgColor='error.50'
            colSpan={4}
          />
          {data.expenses.map((item: IncomeItem) => (
            <TableRow
              key={`expense-${item.code}`}
              hover
            >
              <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell
                align='right'
                sx={{ color: 'error.main' }}
              >
                {formatCurrency(item.amount)}
              </TableCell>
              <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell
              colSpan={2}
              sx={{ fontWeight: 'bold' }}
            >
              {i18n.t('erp.financial_report.label.operating_profit')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold' }}
            >
              {formatCurrency(data.operating_profit)}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell
              colSpan={2}
              sx={{ fontWeight: 'bold' }}
            >
              {i18n.t('erp.financial_report.label.gross_profit')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold' }}
            >
              {formatCurrency(data.gross_profit)}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow sx={{ bgcolor: 'primary.50' }}>
            <TableCell
              colSpan={2}
              sx={{ fontWeight: 'bold' }}
            >
              {i18n.t('erp.financial_report.label.net_profit')}
            </TableCell>
            <TableCell
              align='right'
              sx={{
                fontWeight: 'bold',
                color: data.net_profit >= 0 ? 'success.main' : 'error.main',
              }}
            >
              {formatCurrency(data.net_profit)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};
const CashFlowTable: React.FC<{
  data: CashFlowStatement;
  formatCurrency: (amount: number) => string;
}> = ({ data, formatCurrency }) => {
  const renderActivities = (
    items: CashFlowItem[],
    prefix: string,
    sectionLabel: string,
    sectionBg: string
  ) => (
    <>
      <SectionHeader
        label={sectionLabel}
        bgColor={sectionBg}
        colSpan={3}
      />
      {items.map((item) => (
        <TableRow
          key={`${prefix}-${item.code}`}
          hover
        >
          <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
          <TableCell>{item.name}</TableCell>
          <TableCell
            align='right'
            sx={{ color: item.amount >= 0 ? 'success.main' : 'error.main' }}
          >
            {formatCurrency(item.amount)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
  return (
    <TableContainer
      component={Paper}
      sx={{ boxShadow: 1 }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
              {i18n.t('erp.financial_report.label.item_code')}
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>
              {i18n.t('erp.financial_report.label.item')}
            </TableCell>
            <TableCell
              align='right'
              sx={{ fontWeight: 'bold', width: 180 }}
            >
              {i18n.t('erp.financial_report.label.amount')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {renderActivities(
            data.operating_activities,
            'op',
            i18n.t('erp.financial_report.label.operating_activities'),
            'success.50'
          )}
          {renderActivities(
            data.investing_activities,
            'inv',
            i18n.t('erp.financial_report.label.investing_activities'),
            'warning.50'
          )}
          {renderActivities(
            data.financing_activities,
            'fin',
            i18n.t('erp.financial_report.label.financing_activities'),
            'primary.50'
          )}
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell
              colSpan={2}
              sx={{ fontWeight: 'bold' }}
            >
              {i18n.t('erp.financial_report.label.net_increase_in_cash')}
            </TableCell>
            <TableCell
              align='right'
              sx={{
                fontWeight: 'bold',
                color: data.net_cash_flow >= 0 ? 'success.main' : 'error.main',
              }}
            >
              {formatCurrency(data.net_cash_flow)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export const FinancialReportTables: React.FC<FinancialReportTablesProps> = ({
  activeTab,
  balanceSheet,
  incomeStatement,
  cashFlowStatement,
  loading,
  formatCurrency,
}) => {
  if (loading) {
    return <LoadingState />;
  }
  if (activeTab === 'balance-sheet' && balanceSheet) {
    return (
      <BalanceSheetTable
        data={balanceSheet}
        formatCurrency={formatCurrency}
      />
    );
  }
  if (activeTab === 'income-statement' && incomeStatement) {
    return (
      <IncomeStatementTable
        data={incomeStatement}
        formatCurrency={formatCurrency}
      />
    );
  }
  if (activeTab === 'cash-flow' && cashFlowStatement) {
    return (
      <CashFlowTable
        data={cashFlowStatement}
        formatCurrency={formatCurrency}
      />
    );
  }
  if (activeTab === 'equity-change') {
    return <EmptyEquityChange />;
  }
  return null;
};
