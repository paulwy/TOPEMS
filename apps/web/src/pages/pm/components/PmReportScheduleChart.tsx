import React from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import i18n from '@/i18n';
import type { PmStatistics } from '@/api/pm';
export interface PmReportScheduleChartProps {
  stats: PmStatistics;
}
const PmReportScheduleChart: React.FC<PmReportScheduleChartProps> = ({ stats }) => {
  const data = [
    { name: i18n.t('pm.pm_report_page.name_27ff5f'), value: stats.on_time_projects ?? 0 },
    { name: i18n.t('pm.pm_report_page.name_db732e'), value: stats.delayed_projects ?? 0 },
  ].filter((d) => (d.value ?? 0) > 0);
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={<Typography variant='h6'>{i18n.t('pm.pm_report_page.text_22fd66')}</Typography>}
      />
      <CardContent>
        <Box sx={{ height: 256 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
          >
            <BarChart data={data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey='value'
                name={i18n.t('pm.pm_report_page.attr_607558')}
              >
                <Cell fill='success.main' />
                <Cell fill='error.main' />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
export default PmReportScheduleChart;