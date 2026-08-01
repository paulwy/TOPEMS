import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ChartDatum } from '../hooks/usePmReport';

export interface PmReportRiskPieChartProps {
  data: ChartDatum[];
  outerRadius?: number;
}

const PmReportRiskPieChart: React.FC<PmReportRiskPieChartProps> = ({ data, outerRadius = 60 }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <Typography variant='h6'>{t('pm.pm_report_page.text_99ce9e')}</Typography>
      </CardHeader>
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
                formatter={(value: unknown) => [
                  t('pm.pm_report_page.text_57cd04', { value }),
                  t('pm.pm_report_page.text_bfaab7'),
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

export default PmReportRiskPieChart;
