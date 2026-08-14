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
  Slider,
  AlertTitle,
} from '@mui/material';
import i18n from '@/i18n';
import { Activity, RefreshCw, Lightbulb } from 'lucide-react';
import { assistantApi } from '../../api/ai/assistant';
import { useNotificationStore } from '@/store/notificationStore';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';

export interface AIAnomalyAssistantProps {
  initialMetric?: string;
}

export const AIAnomalyAssistant: React.FC<AIAnomalyAssistantProps> = ({ initialMetric }) => {
  const [metric, setMetric] = useState(initialMetric || '');
  const [timeRange, setTimeRange] = useState('7d');
  const [threshold, setThreshold] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handlePredictAnomaly = async () => {
    if (!metric.trim()) {
      addNotification({ title: i18n.t('components.ai_anomaly_assistant.k1'), message: i18n.t('components.ai_anomaly_assistant.k0'), type: 'warning' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await assistantApi.anomalyPredict({
        metric: metric.trim(),
        time_range: timeRange,
        threshold,
      });

      if (response.success && response.data) {
        setResult(response.data);
        addNotification({
          title: i18n.t('components.ai_anomaly_assistant.k2'),
          message: `${i18n.t('components.ai_anomaly_assistant.k0')} ${response.data.anomaly_count} ${i18n.t('components.ai_anomaly_assistant.k1')}`,
          type: response.data.anomaly_count > 0 ? 'warning' : 'success',
        });
      } else {
        setError(response.message || i18n.t('components.ai_anomaly_assistant.k3'));
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.ai_anomaly_assistant.k2'), err);
      setError(i18n.t('components.ai_anomaly_assistant.k4'));
      addNotification({ title: i18n.t('components.ai_anomaly_assistant.k6'), message: i18n.t('components.ai_anomaly_assistant.k5'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return i18n.t('components.ai_anomaly_assistant.k7');
      case 'medium':
        return i18n.t('components.ai_anomaly_assistant.k8');
      case 'low':
        return i18n.t('components.ai_anomaly_assistant.k9');
      default:
        return severity;
    }
  };

  const renderTimelineChart = () => {
    if (!result?.anomalies || result.anomalies.length === 0) return null;

    const values = result.anomalies.map((a: any) => a.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return (
      <Box sx={{ mt: 3, mb: 4 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 2 }}
        >
          {i18n.t('components.ai_anomaly_assistant.k3')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 1, px: 2 }}>
          {result.anomalies.map((item: any, idx: number) => {
            const height = ((item.value - minValue) / range) * 100;
            const isAnomaly = item.severity !== 'low';
            return (
              <Box
                key={idx}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: isAnomaly ? designTokens.colors.error.main : designTokens.colors.primary.main,
                    borderRadius: '4px 4px 0 0',
                    height: `${Math.max(height, 10)}%`,
                    minHeight: 8,
                    opacity: isAnomaly ? 1 : 0.6,
                    transition: 'height 0.5s ease',
                  }}
                />
                <Typography
                  variant='caption'
                  sx={{
                    mt: 0.5,
                    fontSize: '0.65rem',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'top left',
                  }}
                >
                  {new Date(item.timestamp).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const metrics = [
    { value: 'cpu_usage', label: i18n.t('components.ai_anomaly_assistant.cpu_4') },
    { value: 'memory_usage', label: i18n.t('components.ai_anomaly_assistant.k10') },
    { value: 'disk_io', label: i18n.t('components.ai_anomaly_assistant.io_11') },
    { value: 'network_latency', label: i18n.t('components.ai_anomaly_assistant.k12') },
    { value: 'request_count', label: i18n.t('components.ai_anomaly_assistant.k13') },
    { value: 'error_rate', label: i18n.t('components.ai_anomaly_assistant.k14') },
    { value: 'production_yield', label: i18n.t('components.ai_anomaly_assistant.k15') },
    { value: 'energy_consumption', label: i18n.t('components.ai_anomaly_assistant.k16') },
  ];

  const timeRanges = [
    { value: '1d', label: i18n.t('components.ai_anomaly_assistant.1_5') },
    { value: '7d', label: i18n.t('components.ai_anomaly_assistant.7_6') },
    { value: '30d', label: i18n.t('components.ai_anomaly_assistant.30_7') },
    { value: '90d', label: i18n.t('components.ai_anomaly_assistant.90_8') },
  ];

  return (
    <Card>
      <CardHeader
        title={i18n.t('components.ai_anomaly_assistant.ai_9')}
        subheader={i18n.t('components.ai_anomaly_assistant.k17')}
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            [i18n.t('components.ai_anomaly_assistant.k10')]:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {metrics.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size='small'
                onClick={() => setMetric(item.value)}
                color={metric === item.value ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          fullWidth
          label={i18n.t('components.ai_anomaly_assistant.k18')}
          placeholder={i18n.t('components.ai_anomaly_assistant.k19')}
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          size='small'
          sx={{ mb: 3 }}
        />

        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1.5, color: 'text.secondary' }}
          >
            [i18n.t('components.ai_anomaly_assistant.k11')]:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {timeRanges.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size='small'
                onClick={() => setTimeRange(item.value)}
                color={timeRange === item.value ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3, px: 1 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, color: 'text.secondary' }}
          >
            [i18n.t('components.ai_anomaly_assistant.k12')]: {threshold} {i18n.t('components.ai_anomaly_assistant.k13')}
          </Typography>
          <Slider
            value={threshold}
            onChange={(_, value) => setThreshold(value as number)}
            min={1}
            max={5}
            step={0.5}
            marks={[
              { value: 1, label: '1σ' },
              { value: 2, label: '2σ' },
              { value: 3, label: '3σ' },
              { value: 4, label: '4σ' },
              { value: 5, label: '5σ' },
            ]}
            valueLabelDisplay='auto'
          />
        </Box>

        <Button
          variant='contained'
          onClick={handlePredictAnomaly}
          disabled={isLoading || !metric.trim()}
          startIcon={
            isLoading ? (
              <RefreshCw
                size={18}
                style={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <Activity size={18} />
            )
          }
          fullWidth
        >
          {isLoading ? i18n.t('components.ai_anomaly_assistant.k14') : i18n.t('components.ai_anomaly_assistant.k20')}
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
                title={`${result.metric} ${i18n.t('components.ai_anomaly_assistant.k15')}`}
                subheader={result.summary}
                action={
                  <Chip
                    label={`${result.anomaly_count} ${i18n.t('components.ai_anomaly_assistant.k16')}`}
                    color={result.anomaly_count > 0 ? 'error' : 'success'}
                    size='small'
                  />
                }
              />
              <CardContent>
                {renderTimelineChart()}

                {result.anomalies && result.anomalies.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant='subtitle2'
                      sx={{ mb: 2 }}
                    >
                      {i18n.t('components.ai_anomaly_assistant.k17')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {result.anomalies.map((anomaly: any, idx: number) => (
                        <Alert
                          key={idx}
                          severity={getSeverityColor(anomaly.severity)}
                          sx={{ mb: 1 }}
                        >
                          <AlertTitle>
                            {new Date(anomaly.timestamp).toLocaleString('zh-CN')}
                          </AlertTitle>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant='body2'>
                              [i18n.t('components.ai_anomaly_assistant.k18')]: <strong>{anomaly.value.toFixed(2)}</strong>
                              {anomaly.expected !== undefined && (
                                <span> | 预期值: {anomaly.expected.toFixed(2)}</span>
                              )}
                            </Typography>
                            <Typography variant='body2'>
                              [i18n.t('components.ai_anomaly_assistant.k19')]: <strong>{getSeverityLabel(anomaly.severity)}</strong>
                            </Typography>
                            {anomaly.reason && (
                              <Typography
                                variant='body2'
                                sx={{ mt: 0.5 }}
                              >
                                {anomaly.reason}
                              </Typography>
                            )}
                          </Box>
                        </Alert>
                      ))}
                    </Box>
                  </Box>
                )}

                {result.suggestions && result.suggestions.length > 0 && (
                  <Card sx={{ mt: 4 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Lightbulb
                          size={20}
                          style={{ color: 'warning.500' }}
                        />
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          {i18n.t('components.ai_anomaly_assistant.k20')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {result.suggestions.map((suggestion: string, idx: number) => (
                          <Typography
                            key={idx}
                            variant='body2'
                          >
                            {idx + 1}. {suggestion}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
