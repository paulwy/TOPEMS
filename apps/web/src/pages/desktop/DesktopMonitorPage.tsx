import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { Monitor, Gauge, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { StatsPageTemplate } from '@/components/templates';
import { tauriApi } from '../../services/tauriApi';
import { tauriAuth } from '../../services/tauriAuth';

interface ApiMetrics {
  total_requests: number;
  success_count: number;
  failure_count: number;
  retry_count: number;
  avg_response_time_ms: number;
}

interface HealthStatus {
  status?: string;
  version?: string;
  uptime?: string;
  [key: string]: unknown;
}

const row = { display: 'flex', flexDirection: 'row' as const };
const center = { alignItems: 'center' as const };
const gap = (n: number) => ({ gap: n * 8 });

const DesktopMonitorPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [metrics, setMetrics] = useState<ApiMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, h, c] = await Promise.allSettled([
        tauriApi.getMetrics(),
        tauriApi.checkHealth(),
        tauriApi.getSystemConfig(),
      ]);

      if (m.status === 'fulfilled') setMetrics(m.value as ApiMetrics);
      if (h.status === 'fulfilled') setHealth(h.value as HealthStatus);
      if (c.status === 'fulfilled') setConfig(c.value);

      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsDesktop(tauriAuth.isAvailable());
    fetchAll();
  }, [fetchAll]);

  const successRate =
    metrics && metrics.total_requests > 0
      ? (metrics.success_count / metrics.total_requests) * 100
      : 0;

  const failureRate =
    metrics && metrics.total_requests > 0
      ? (metrics.failure_count / metrics.total_requests) * 100
      : 0;

  if (!isDesktop) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
          <Monitor
            size={64}
            color={theme.palette.text.secondary}
            style={{ marginBottom: 16 }}
          />
          <Typography
            variant='h5'
            gutterBottom
          >
            {t('desktop.monitor.title')}
          </Typography>
          <Typography color='text.secondary'>{t('desktop.monitor.browser_notice')}</Typography>
        </Paper>
      </Box>
    );
  }

  const statCards = [
    {
      id: 'total_requests',
      title: t('desktop.monitor.total_requests'),
      value: metrics ? (
        <Typography variant='h4'>{metrics.total_requests}</Typography>
      ) : (
        <CircularProgress size={24} />
      ),
      icon: <Gauge size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'success_count',
      title: t('common.success'),
      value: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            variant='h4'
            sx={{ color: 'success.main' }}
          >
            {metrics?.success_count ?? 0}
          </Typography>
          <LinearProgress
            variant='determinate'
            value={successRate}
            sx={{ height: 6, borderRadius: 3 }}
            color='success'
          />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {successRate.toFixed(1)}% {t('desktop.monitor.success_rate')}
          </Typography>
        </Box>
      ),
      icon: <CheckCircle size={20} />,
      color: 'success' as const,
    },
    {
      id: 'failure_count',
      title: t('common.failure'),
      value: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            variant='h4'
            sx={{ color: 'error.main' }}
          >
            {metrics?.failure_count ?? 0}
          </Typography>
          <LinearProgress
            variant='determinate'
            value={failureRate}
            sx={{ height: 6, borderRadius: 3 }}
            color='error'
          />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {failureRate.toFixed(1)}% {t('desktop.monitor.failure_rate')}
          </Typography>
        </Box>
      ),
      icon: <XCircle size={20} />,
      color: 'error' as const,
    },
    {
      id: 'retry_count',
      title: t('desktop.monitor.retry_count'),
      value: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            variant='h4'
            sx={{ color: 'warning.main' }}
          >
            {metrics?.retry_count ?? 0}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('desktop.monitor.avg_response')}:{' '}
            {metrics ? `${metrics.avg_response_time_ms.toFixed(0)}ms` : '-'}
          </Typography>
        </Box>
      ),
      icon: <RefreshCw size={20} />,
      color: 'warning' as const,
    },
  ];

  return (
    <StatsPageTemplate
      title={t('desktop.monitor.title')}
      statCards={statCards}
      loading={loading}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
      showTables={false}
      actions={
        <Button
          variant='outlined'
          startIcon={
            <Box
              component='span'
              sx={{
                display: 'inline-flex',
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            >
              <RefreshCw size={18} />
            </Box>
          }
          onClick={fetchAll}
          disabled={loading}
          size='small'
        >
          {t('common.refresh')}
        </Button>
      }
    >
      {lastRefresh && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={t('desktop.monitor.updated_at', { time: lastRefresh.toLocaleTimeString() })}
            size='small'
            variant='outlined'
          />
        </Box>
      )}

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Box sx={{ ...row, ...center, ...gap(1) }}>
            <XCircle size={20} />
            <Typography variant='body2'>{error}</Typography>
          </Box>
        </Paper>
      )}

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                gutterBottom
              >
                {t('desktop.monitor.backend_health')}
              </Typography>
              {health ? (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {t('desktop.monitor.attribute')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('desktop.monitor.value')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(health).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell
                            component='th'
                            scope='row'
                          >
                            {key}
                          </TableCell>
                          <TableCell>
                            {typeof value === 'string' || typeof value === 'number'
                              ? String(value)
                              : JSON.stringify(value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {t('desktop.monitor.health_unavailable')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                gutterBottom
              >
                {t('desktop.monitor.system_config')}
              </Typography>
              {config ? (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  <Typography
                    component='pre'
                    sx={{
                      fontSize: 12,
                      bgcolor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      m: 0,
                    }}
                  >
                    {JSON.stringify(config, null, 2)}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {t('desktop.monitor.config_unavailable')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </StatsPageTemplate>
  );
};

export default DesktopMonitorPage;
