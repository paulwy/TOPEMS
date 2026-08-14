import React from 'react';
import { Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { PieChart, TrendingUp, Activity, Building2 } from 'lucide-react';
import type { PeriodOption, TabConfig } from '../hooks/useFinancialReport';
import i18n from '@/i18n';
interface FinancialReportFiltersProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  periodType: string;
  onPeriodTypeChange: (value: string) => void;
  period: string;
  onPeriodChange: (value: string) => void;
  periodOptions: PeriodOption[];
  tabs: TabConfig[];
}
const TAB_ICONS: Record<string, React.ReactElement> = {
  'balance-sheet': <PieChart size={16} />,
  'income-statement': <TrendingUp size={16} />,
  'cash-flow': <Activity size={16} />,
  'equity-change': <Building2 size={16} />,
};
export const FinancialReportFilters: React.FC<FinancialReportFiltersProps> = ({
  activeTab,
  onTabChange,
  periodType,
  onPeriodTypeChange,
  period,
  onPeriodChange,
  periodOptions,
  tabs,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => onTabChange(newValue)}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={TAB_ICONS[tab.value]}
            iconPosition='start'
          />
        ))}
      </Tabs>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>{i18n.t('erp.financial_report.label.period_type')}</InputLabel>
          <Select
            value={periodType}
            label={i18n.t('erp.financial_report.label.period_type')}
            onChange={(e) => onPeriodTypeChange(e.target.value)}
          >
            <MenuItem value='year'>{i18n.t('erp.financial_report.label.year')}</MenuItem>
            <MenuItem value='quarter'>{i18n.t('erp.financial_report.label.quarter')}</MenuItem>
            <MenuItem value='month'>{i18n.t('erp.financial_report.label.month')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 160 }}
        >
          <InputLabel>{i18n.t('erp.financial_report.label.select_period')}</InputLabel>
          <Select
            value={period}
            label={i18n.t('erp.financial_report.label.select_period')}
            onChange={(e) => onPeriodChange(e.target.value)}
          >
            {periodOptions.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};