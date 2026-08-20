import React from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ChartDatum } from '../hooks/usePmReport';
import i18n from '@/i18n';

interface PmReportStatusPieChartProps {
  data: ChartDatum[];
  outerRadius?: number;
}
const PmReportStatusPieChart: React.FC<PmReportStatusPieChartProps> = ({
  data,
  outerRadius = 80,
}) => {
  return (
    <Card>
      <CardHeader
        title={<Typography variant='h6'>{i18n.t('pm.pm_report_page.text_068934')}</Typography>}
      />
      <CardContent>
        <Box sx={{ height: 256 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
          >
            <PieChart>
              <Pie
                data={data}
                cx='50%'
                cy='50%'
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={outerRadius}
                dataKey='value'
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  i18n.t('pm.pm_report_page.text_930882', { value }),
                  i18n.t('pm.pm_report_page.text_bfaab7'),
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
export default PmReportStatusPieChart;
