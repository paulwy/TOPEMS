import React from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import i18n from '@/i18n';
import type { TrendDatum } from '../hooks/usePmReport';
export interface PmReportTrendChartProps {
  data: TrendDatum[];
}
const PmReportTrendChart: React.FC<PmReportTrendChartProps> = ({ data }) => {
  const chartData =
    data.length > 0 ? data : [{ month: i18n.t('pm.pm_report_page.month_21efd8'), cpi: 1, spi: 1 }];
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={<Typography variant='h6'>{i18n.t('pm.pm_report_page.text_266064')}</Typography>}
      />
      <CardContent>
        <Box sx={{ height: 256 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
          >
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='month' />
              <YAxis domain={[0.5, 1.5]} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='cpi'
                name='CPI'
                stroke='primary.main'
                strokeWidth={2}
              />
              <Line
                type='monotone'
                dataKey='spi'
                name='SPI'
                stroke='success.main'
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
export default PmReportTrendChart;