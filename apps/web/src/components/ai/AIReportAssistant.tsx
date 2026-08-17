import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Sparkles,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { assistantApi } from '../../api/ai/assistant';
import { useNotificationStore } from '@/store/notificationStore';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';

export interface AIReportAssistantProps {
  initialQuery?: string;
}

interface ReportResult {
  chart_type: string;
  data: Record<string, unknown>[];
  metrics: Record<string, unknown>[];
  title: string;
  description: string;
}

export const AIReportAssistant: React.FC<AIReportAssistantProps> = ({ initialQuery }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleGenerateReport = async () => {
    if (!query.trim()) {
      addNotification({
        title: i18n.t('components.ai_report_assistant.k1'),
        message: i18n.t('components.ai_report_assistant.k0'),
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await assistantApi.reportAssistant({
        query: query.trim(),
      });

      if (response.success && response.data) {
        setResult({
          title: response.data.title,
          description: response.data.description ?? '',
          chart_type: response.data.chart_type,
          data: response.data.data as Record<string, unknown>[],
          metrics: (response.data.metrics ?? []) as unknown as Record<string, unknown>[],
        });
        addNotification({
          title: i18n.t('components.ai_report_assistant.k3'),
          message: i18n.t('components.ai_report_assistant.k2'),
          type: 'success',
        });
      } else {
        setError(response.message || i18n.t('components.ai_report_assistant.k4'));
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.ai_report_assistant.k0'), err);
      setError(i18n.t('components.ai_report_assistant.k5'));
      addNotification({
        title: i18n.t('components.ai_report_assistant.k7'),
        message: i18n.t('components.ai_report_assistant.k6'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    if (!result) return null;

    switch (result.chart_type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'table':
        return renderTable();
      case 'metric':
        return renderMetrics();
      default:
        return renderTable();
    }
  };

  const renderLineChart = () => {
    if (!result) return null;
    const maxValue = Math.max(
      ...result.data.map((d: Record<string, unknown>) => d.value as number)
    );
    return (
      <Box sx={{ mt: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 2 }}
        >
          {i18n.t('components.ai_report_assistant.k1')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 4 }}>
          {result.data.map((item: Record<string, unknown>, idx: number) => (
            <Box
              key={idx}
              sx={{ flex: 1 }}
            >
              <Box
                sx={{
                  bgcolor: 'primary.500',
                  borderRadius: '4px 4px 0 0',
                  height: `${((item.value as number) / maxValue) * 100}%`,
                  minHeight: 20,
                  transition: 'height 0.5s ease',
                }}
              />
              <Typography
                variant='caption'
                sx={{ mt: 1, display: 'block', textAlign: 'center' }}
              >
                {item.label as string}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderBarChart = () => {
    if (!result) return null;
    const maxValue = Math.max(
      ...result.data.map((d: Record<string, unknown>) => d.value as number)
    );
    return (
      <Box sx={{ mt: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 2 }}
        >
          {i18n.t('components.ai_report_assistant.k2')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 4 }}>
          {result.data.map((item: Record<string, unknown>, idx: number) => (
            <Box
              key={idx}
              sx={{ flex: 1 }}
            >
              <Box
                sx={{
                  bgcolor: 'teal.500',
                  borderRadius: '4px 4px 0 0',
                  height: `${((item.value as number) / maxValue) * 100}%`,
                  minHeight: 20,
                  transition: 'height 0.5s ease',
                }}
              />
              <Typography
                variant='caption'
                sx={{ mt: 1, display: 'block', textAlign: 'center' }}
              >
                {item.label as string}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderPieChart = () => {
    if (!result) return null;
    const total = result.data.reduce(
      (sum: number, item: Record<string, unknown>) => sum + (item.value as number),
      0
    );
    const colors = [
      designTokens.colors.primary.main,
      designTokens.colors.success.dark,
      designTokens.colors.warning.main,
      designTokens.colors.error.main,
      designTokens.colors.secondary.main,
      designTokens.colors.pink.main,
    ];
    let cumulativeAngle = 0;

    return (
      <Box sx={{ mt: 3, display: 'flex', gap: 8 }}>
        <Box sx={{ position: 'relative', width: 200, height: 200 }}>
          <svg
            viewBox='0 0 100 100'
            style={{ width: '100%', height: '100%' }}
          >
            {result.data.map((item: Record<string, unknown>, idx: number) => {
              const angle = ((item.value as number) / total) * 360;
              const startAngle = cumulativeAngle;
              cumulativeAngle += angle;

              const startRad = ((startAngle - 90) * Math.PI) / 180;
              const endRad = ((startAngle + angle - 90) * Math.PI) / 180;

              const x1 = 50 + 40 * Math.cos(startRad);
              const y1 = 50 + 40 * Math.sin(startRad);
              const x2 = 50 + 40 * Math.cos(endRad);
              const y2 = 50 + 40 * Math.sin(endRad);

              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={idx}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={colors[idx % colors.length]}
                  stroke='white'
                  strokeWidth='1'
                />
              );
            })}
          </svg>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant='h4'>{result.data.length}</Typography>
            <Typography variant='caption'>{i18n.t('components.ai_report_assistant.k8')}</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          {result.data.map((item: Record<string, unknown>, idx: number) => (
            <Box
              key={idx}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  bgcolor: colors[idx % colors.length],
                }}
              />
              <Typography variant='body2'>{item.label as string}</Typography>
              <Typography
                variant='body2'
                sx={{ marginLeft: 'auto', fontWeight: 500 }}
              >
                {(item.value as number).toLocaleString()} (
                {(((item.value as number) / total) * 100).toFixed(1)}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderTable = () => {
    if (!result) return null;
    if (!result.data || result.data.length === 0) {
      return (
        <Typography
          variant='body2'
          sx={{ mt: 3, color: 'text.secondary' }}
        >
          {i18n.t('components.ai_report_assistant.k3')}
        </Typography>
      );
    }

    const headers = Object.keys(result.data[0]);

    return (
      <Box sx={{ mt: 3, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  style={{
                    borderBottom: '2px solid #e5e7eb',
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'grey.600',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.data.map((row: Record<string, unknown>, idx: number) => (
              <tr
                key={idx}
                style={{ borderBottom: '1px solid #f3f4f6' }}
              >
                {headers.map((header) => (
                  <td
                    key={header}
                    style={{ padding: '8px 12px', color: 'grey.700' }}
                  >
                    {row[header] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  };

  const renderMetrics = () => {
    if (!result) return null;
    if (!result.metrics || result.metrics.length === 0) return null;

    return (
      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 3,
        }}
      >
        {result.metrics.map((metric: Record<string, unknown>, idx: number) => (
          <Card key={idx}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', mb: 1 }}
              >
                {metric.label as string}
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 600 }}
              >
                {(metric.value as number).toLocaleString()}
                {(metric.unit as string | undefined) && (
                  <Typography
                    variant='body1'
                    component='span'
                    sx={{ ml: 1, color: 'text.secondary' }}
                  >
                    {metric.unit as string}
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  const getChartIcon = () => {
    if (!result) return <BarChart3 size={24} />;
    switch (result.chart_type) {
      case 'line':
        return <LineChart size={24} />;
      case 'bar':
        return <BarChart3 size={24} />;
      case 'pie':
        return <PieChart size={24} />;
      case 'table':
        return <Table2 size={24} />;
      case 'metric':
        return <TrendingUp size={24} />;
      default:
        return <BarChart3 size={24} />;
    }
  };

  const examples = [
    i18n.t('components.ai_report_assistant.k9'),
    i18n.t('components.ai_report_assistant.k10'),
    i18n.t('components.ai_report_assistant.k11'),
    i18n.t('components.ai_report_assistant.k12'),
    i18n.t('components.ai_report_assistant.k13'),
  ];

  return (
    <Card>
      <CardHeader
        title={i18n.t('components.ai_report_assistant.ai_4')}
        subheader={i18n.t('components.ai_report_assistant.k14')}
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            [i18n.t('components.ai_report_assistant.k5')]:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {examples.map((example, idx) => (
              <Chip
                key={idx}
                label={example}
                size='small'
                onClick={() => setQuery(example)}
                sx={{ cursor: 'pointer', bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          fullWidth
          label={i18n.t('components.ai_report_assistant.k15')}
          placeholder={i18n.t('components.ai_report_assistant.k16')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size='small'
          sx={{ mb: 3 }}
        />

        <Button
          variant='contained'
          onClick={handleGenerateReport}
          disabled={isLoading || !query.trim()}
          startIcon={
            isLoading ? (
              <RefreshCw
                size={18}
                sx={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <Sparkles size={18} />
            )
          }
          fullWidth
        >
          {isLoading
            ? i18n.t('components.ai_report_assistant.k6')
            : i18n.t('components.ai_report_assistant.k17')}
        </Button>

        {error && (
          <Alert
            severity='error'
            sx={{ mt: 3 }}
          >
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader
                title={result.title}
                subheader={result.description}
                action={getChartIcon()}
              />
              <CardContent>{renderChart()}</CardContent>
            </Card>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
