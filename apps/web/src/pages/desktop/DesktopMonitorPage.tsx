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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MonitorIcon from '@mui/icons-material/Monitor';
import SpeedIcon from '@mui/icons-material/Speed';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
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
          <MonitorIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ ...row, ...center, justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ ...row, ...center, ...gap(2) }}>
          <MonitorIcon color='primary' />
          <Typography variant='h5'>{t('desktop.monitor.title')}</Typography>
          {lastRefresh && (
            <Chip
              label={t('desktop.monitor.updated_at', { time: lastRefresh.toLocaleTimeString() })}
              size='small'
              variant='outlined'
            />
          )}
        </Box>
        <Button
          variant='outlined'
          startIcon={loading ? <SyncIcon /> : <RefreshIcon />}
          onClick={fetchAll}
          disabled={loading}
        >
          {t('common.refresh')}
        </Button>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Box sx={{ ...row, ...center, ...gap(1) }}>
            <ErrorIcon />
            <Typography variant='body2'>{error}</Typography>
          </Box>
        </Paper>
      )}

      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ ...row, ...center, ...gap(1) }}>
                <SpeedIcon color='primary' />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('desktop.monitor.total_requests')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ mt: 1 }}
              >
                {metrics?.total_requests ?? <CircularProgress size={24} />}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ ...row, ...center, ...gap(1) }}>
                <CheckCircleIcon color='success' />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('common.success')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ mt: 1, color: 'success.main' }}
              >
                {metrics?.success_count ?? 0}
              </Typography>
              <LinearProgress
                variant='determinate'
                value={successRate}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color='success'
              />
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {successRate.toFixed(1)}% {t('desktop.monitor.success_rate')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ ...row, ...center, ...gap(1) }}>
                <ErrorIcon color='error' />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('common.failure')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ mt: 1, color: 'error.main' }}
              >
                {metrics?.failure_count ?? 0}
              </Typography>
              <LinearProgress
                variant='determinate'
                value={failureRate}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color='error'
              />
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {failureRate.toFixed(1)}% {t('desktop.monitor.failure_rate')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ ...row, ...center, ...gap(1) }}>
                <SyncIcon color='warning' />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('desktop.monitor.retry_count')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ mt: 1, color: 'warning.main' }}
              >
                {metrics?.retry_count ?? 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 1, display: 'block' }}
              >
                {t('desktop.monitor.avg_response')}:{' '}
                {metrics ? `${metrics.avg_response_time_ms.toFixed(0)}ms` : '-'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
    </Box>
  );
};

export default DesktopMonitorPage;
