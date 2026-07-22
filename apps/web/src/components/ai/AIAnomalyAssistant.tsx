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
import {
  Activity,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { assistantApi } from '../../api/ai/assistant';
import { useNotificationStore } from '@/store/notificationStore';
import { logger } from '@/utils/logger';

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
      addNotification({ title: '警告', message: '请输入监控指标', type: 'warning' });
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
          title: '分析完成',
          message: `发现 ${response.data.anomaly_count} 个异常点`,
          type: response.data.anomaly_count > 0 ? 'warning' : 'success',
        });
      } else {
        setError(response.message || '异常预测失败');
      }
    } catch (err: unknown) {
      logger.error('异常预测调用失败:', err);
      setError('异常预测服务暂不可用');
      addNotification({ title: '错误', message: '异常预测服务暂不可用', type: 'error' });
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
        return '严重';
      case 'medium':
        return '中等';
      case 'low':
        return '轻微';
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
        <Typography variant="subtitle2" sx={{ mb: 2 }}>异常点分布</Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 1, px: 2 }}>
          {result.anomalies.map((item: any, idx: number) => {
            const height = ((item.value - minValue) / range) * 100;
            const isAnomaly = item.severity !== 'low';
            return (
              <Box key={idx} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: isAnomaly ? '#ef4444' : '#3b82f6',
                    borderRadius: '4px 4px 0 0',
                    height: `${Math.max(height, 10)}%`,
                    minHeight: 8,
                    opacity: isAnomaly ? 1 : 0.6,
                    transition: 'height 0.5s ease',
                  }}
                />
                <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.65rem', transform: 'rotate(-45deg)', transformOrigin: 'top left' }}>
                  {new Date(item.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const metrics = [
    { value: 'cpu_usage', label: 'CPU 使用率' },
    { value: 'memory_usage', label: '内存使用率' },
    { value: 'disk_io', label: '磁盘 IO' },
    { value: 'network_latency', label: '网络延迟' },
    { value: 'request_count', label: '请求量' },
    { value: 'error_rate', label: '错误率' },
    { value: 'production_yield', label: '生产良率' },
    { value: 'energy_consumption', label: '能耗' },
  ];

  const timeRanges = [
    { value: '1d', label: '1天' },
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' },
    { value: '90d', label: '90天' },
  ];

  return (
    <Card>
      <CardHeader
        title="AI 异常预警"
        subheader="基于历史数据预测业务指标异常，提前发现潜在风险"
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>监控指标:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {metrics.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="small"
                onClick={() => setMetric(item.value)}
                color={metric === item.value ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          fullWidth
          label="监控指标"
          placeholder="例如：cpu_usage、production_yield"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          size="small"
          sx={{ mb: 3 }}
        />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>时间范围:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {timeRanges.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="small"
                onClick={() => setTimeRange(item.value)}
                color={timeRange === item.value ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3, px: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            异常阈值: {threshold} 倍标准差
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
            valueLabelDisplay="auto"
          />
        </Box>

        <Button
          variant="contained"
          onClick={handlePredictAnomaly}
          disabled={isLoading || !metric.trim()}
          startIcon={isLoading ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={18} />}
          fullWidth
        >
          {isLoading ? '分析中...' : '开始异常预测'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader
                title={`${result.metric} 异常分析`}
                subheader={result.summary}
                action={
                  <Chip
                    label={`${result.anomaly_count} 个异常`}
                    color={result.anomaly_count > 0 ? 'error' : 'success'}
                    size="small"
                  />
                }
              />
              <CardContent>
                {renderTimelineChart()}

                {result.anomalies && result.anomalies.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>异常详情</Typography>
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
                            <Typography variant="body2">
                              实际值: <strong>{anomaly.value.toFixed(2)}</strong>
                              {anomaly.expected !== undefined && (
                                <span> | 预期值: {anomaly.expected.toFixed(2)}</span>
                              )}
                            </Typography>
                            <Typography variant="body2">
                              严重程度: <strong>{getSeverityLabel(anomaly.severity)}</strong>
                            </Typography>
                            {anomaly.reason && (
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
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
                        <Lightbulb size={20} style={{ color: '#f59e0b' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>处理建议</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {result.suggestions.map((suggestion: string, idx: number) => (
                          <Typography key={idx} variant="body2">
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
