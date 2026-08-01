/**
 * @done V80 split
 * Report assistant tab: form + chart/table result visualization.
 */
import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReportAssistantResponse } from '@/api/ai';
import { BIChartColors } from '@/components/charts/chartTheme';
import MetricCard from './AiAssistantMetricCard';

const DEFAULT_PIE_COLORS = [...BIChartColors.series, '#06B6D4', '#EC4899'];

export interface AiAssistantReportTabProps {
  reportQuery: string;
  setReportQuery: (v: string) => void;
  reportDataSource: string;
  setReportDataSource: (v: string) => void;
  reportTimeRange: string;
  setReportTimeRange: (v: string) => void;
  loading: boolean;
  reportResult: ReportAssistantResponse | null;
  onSubmit: () => void;
}

const ReportResultView: React.FC<{ result: ReportAssistantResponse }> = ({ result }) => {
  const xKey = result.x_axis || 'name';
  const yKeys: string[] = result.y_axis
    ? Array.isArray(result.y_axis)
      ? result.y_axis
      : [result.y_axis]
    : result.data.length > 0
      ? Object.keys(result.data[0]).filter(
          (k) => k !== xKey && typeof result.data[0][k] === 'number'
        )
      : [];

  const renderChart = () => {
    switch (result.chart_type) {
      case 'line':
        return (
          <ResponsiveContainer
            width='100%'
            height={320}
          >
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Line
                  key={key}
                  type='monotone'
                  dataKey={key}
                  stroke={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer
            width='100%'
            height={320}
          >
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie': {
        const pieData = result.data.map((item) => ({
          name: item[xKey] || item.name || item.label || 'Unknown',
          value: Number(item[yKeys[0] || 'value']) || 0,
        }));
        return (
          <ResponsiveContainer
            width='100%'
            height={320}
          >
            <PieChart>
              <Pie
                data={pieData}
                cx='50%'
                cy='50%'
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey='value'
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case 'metric':
        return (
          <Grid
            container
            spacing={2}
          >
            {(result.metrics || []).map((metric, index) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4 }}
                key={`${metric.label}-${index}`}
              >
                <MetricCard
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                />
              </Grid>
            ))}
          </Grid>
        );
      case 'table':
      default: {
        const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
        return (
          <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {result.data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((col) => (
                      <TableCell key={`${rowIndex}-${col}`}>{String(row[col] ?? '')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      }
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 1 }}
      >
        {result.title}
      </Typography>
      {result.description && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {result.description}
        </Typography>
      )}
      {result.sql && (
        <Paper
          sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}
          variant='outlined'
        >
          <Typography
            variant='caption'
            component='pre'
            sx={{ fontFamily: 'monospace', m: 0, whiteSpace: 'pre-wrap' }}
          >
            {result.sql}
          </Typography>
        </Paper>
      )}
      <Paper sx={{ p: 2 }}>{renderChart()}</Paper>
    </Box>
  );
};

const AiAssistantReportTab: React.FC<AiAssistantReportTabProps> = ({
  reportQuery,
  setReportQuery,
  reportDataSource,
  setReportDataSource,
  reportTimeRange,
  setReportTimeRange,
  loading,
  reportResult,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.report.title')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.report.desc')}
        </Typography>
        <TextField
          fullWidth
          label={t('ai.assistant.report.label.query')}
          placeholder={t('ai.assistant.report.placeholder.query')}
          value={reportQuery}
          onChange={(e) => setReportQuery(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label={t('ai.assistant.report.label.data_source')}
            placeholder={t('ai.assistant.report.placeholder.data_source')}
            value={reportDataSource}
            onChange={(e) => setReportDataSource(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('ai.assistant.report.label.time_range')}
            placeholder={t('ai.assistant.report.placeholder.time_range')}
            value={reportTimeRange}
            onChange={(e) => setReportTimeRange(e.target.value)}
            fullWidth
          />
        </Box>
        <Button
          variant='contained'
          startIcon={
            loading ? (
              <CircularProgress
                size={18}
                color='inherit'
              />
            ) : (
              <Send size={18} />
            )
          }
          onClick={onSubmit}
          disabled={loading || !reportQuery.trim()}
        >
          {t('ai.assistant.report.button.generate')}
        </Button>
      </Paper>
      {reportResult && <ReportResultView result={reportResult} />}
    </Box>
  );
};

export default AiAssistantReportTab;
