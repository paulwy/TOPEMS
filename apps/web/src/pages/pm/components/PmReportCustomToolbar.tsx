import React from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { PM_PATHS } from '@/modules/pm/config';
import PmReportStatusPieChart from './PmReportStatusPieChart';
import PmReportRiskPieChart from './PmReportRiskPieChart';
import PmReportTrendChart from './PmReportTrendChart';
import PmReportBudgetCard from './PmReportBudgetCard';
import PmReportScheduleChart from './PmReportScheduleChart';
import PmReportBenefitsTable from './PmReportBenefitsTable';
import type { PmStatistics, ProjectBenefit } from '@/api/pm';
import type { ChartDatum, TrendDatum } from '../hooks/UsePmReport';
import i18n from '@/i18n';

interface PmReportCustomToolbarProps {
  params: { projectId?: string };
  navigate: (path: string) => void;
  projectStatusData: ChartDatum[];
  riskData: ChartDatum[];
  trendData: TrendDatum[];
  budgetUtilization: number;
  stats: PmStatistics;
  benefits: ProjectBenefit[];
}
const PmReportCustomToolbar: React.FC<PmReportCustomToolbarProps> = ({
  params,
  navigate,
  projectStatusData,
  riskData,
  trendData,
  budgetUtilization,
  stats,
  benefits,
}) => {
  return (
    <Box>
      {params.projectId && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Button
              variant='outlined'
              onClick={() => navigate(PM_PATHS.reports)}
            >
              {i18n.t('pm.pm_report_page.text_2e5b6d')}
            </Button>
          </CardContent>
        </Card>
      )}
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        {i18n.t('pm.pm_report_page.text_a734d9')}
      </Typography>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}
      >
        <PmReportStatusPieChart data={projectStatusData} />
        <PmReportRiskPieChart data={riskData} />
      </Box>
      <PmReportTrendChart data={trendData} />
      <PmReportBudgetCard
        stats={stats}
        budgetUtilization={budgetUtilization}
      />
      <PmReportScheduleChart stats={stats} />
      <PmReportBenefitsTable benefits={benefits} />
    </Box>
  );
};
export default PmReportCustomToolbar;
