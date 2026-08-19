import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import i18n, { ensureNamespacesLoaded } from '@/i18n';
import {
  ChevronDown as ChevronDownIcon,
  X as XIcon,
  Download as DownloadIcon,
  AlertTriangle as AlertIcon,
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Activity as ActivityIcon,
  Eye as EyeIcon,
  Zap as ZapIcon,
} from 'lucide-react';
import {
  modulePerformanceMetrics,
  type ModulePerformanceMetrics,
} from './module-performance-metrics';
import { errorTracker, type ErrorStats } from './error-tracker';
import { userBehaviorAnalytics, type ModuleVisitStats } from './user-behavior-analytics';
import { designTokens, semanticTokens } from '@topems/tokens';

const SLOW_MODULE_THRESHOLD = 3000;

const ObservabilityPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [performanceData, setPerformanceData] = useState<ModulePerformanceMetrics[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [behaviorStats, setBehaviorStats] = useState<ModuleVisitStats[]>([]);
  const [, forceUpdate] = useState(0);
  const [nsReady, setNsReady] = useState(false);

  useEffect(() => {
    ensureNamespacesLoaded(['microfrontend'])
      .then(() => setNsReady(true))
      .catch(() => setNsReady(true));
  }, []);

  const refreshData = useCallback(() => {
    setPerformanceData(modulePerformanceMetrics.getAllModulePerformance());
    setErrorStats(errorTracker.getErrorStats());
    setBehaviorStats(userBehaviorAnalytics.getModuleVisitStats() as ModuleVisitStats[]);
    forceUpdate((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [isExpanded, refreshData]);

  const sortedPerformance = [...performanceData].sort((a, b) => b.totalLoadTime - a.totalLoadTime);

  const slowModules = sortedPerformance.filter((m) => m.totalLoadTime > SLOW_MODULE_THRESHOLD);

  const handleExport = () => {
    const data = {
      performance: performanceData,
      errors: errorStats,
      behavior: behaviorStats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observability-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDurationShort = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const totalErrors = errorStats?.totalErrors || 0;
  const totalVisits = behaviorStats.reduce((sum, s) => sum + s.visitCount, 0);

  if (!nsReady) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {!isExpanded ? (
        <Tooltip title={i18n.t('microfrontend.observability_panel.k0')}>
          <Button
            variant='contained'
            startIcon={<ActivityIcon size={18} />}
            onClick={() => setIsExpanded(true)}
            sx={{
              bgcolor: 'info.600',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
              '&:hover': {
                bgcolor: 'primary.700',
              },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.observability_panel.k0')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {slowModules.length > 0 && (
                  <Chip
                    label={`${slowModules.length}${i18n.t('microfrontend.observability_panel.k17')}`}
                    size='small'
                    color='warning'
                    sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: 10 } }}
                  />
                )}
                {totalErrors > 0 && (
                  <Chip
                    label={`${totalErrors}${i18n.t('microfrontend.observability_panel.k18')}`}
                    size='small'
                    color='error'
                    sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: 10 } }}
                  />
                )}
              </Box>
            </Box>
          </Button>
        </Tooltip>
      ) : (
        <Box
          sx={{
            width: 480,
            maxHeight: '80vh',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: `0 8px 32px ${designTokens.colors.cyber.glass.divider}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ActivityIcon size={20} />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.observability_panel.k1')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={i18n.t('microfrontend.observability_panel.k19')}>
                <IconButton
                  size='small'
                  onClick={handleExport}
                  sx={{ color: 'common.white' }}
                >
                  <DownloadIcon size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={i18n.t('microfrontend.observability_panel.k2')}>
                <IconButton
                  size='small'
                  onClick={() => setIsExpanded(false)}
                  sx={{ color: 'common.white' }}
                >
                  <XIcon size={18} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ChevronDownIcon size={18} />}
                sx={{ minHeight: 40 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ZapIcon
                    size={16}
                    color={designTokens.colors.warning.main}
                  />
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('microfrontend.observability_panel.k20')}
                  </Typography>
                  <Chip
                    label={sortedPerformance.length}
                    size='small'
                    sx={{ height: 18, fontSize: 10 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {sortedPerformance.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.observability_panel.k3')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sortedPerformance.slice(0, 10).map((m, idx) => (
                      <Box
                        key={m.moduleId}
                        sx={{
                          p: 1.5,
                          bgcolor:
                            m.totalLoadTime > SLOW_MODULE_THRESHOLD
                              ? 'warning.lighter'
                              : 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant='caption'
                              sx={{
                                fontWeight: 700,
                                color: idx < 3 ? 'primary.main' : 'text.secondary',
                                width: 20,
                              }}
                            >
                              #{idx + 1}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {m.moduleId}
                            </Typography>
                          </Box>
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 700,
                              color:
                                m.totalLoadTime > SLOW_MODULE_THRESHOLD
                                  ? 'warning.main'
                                  : 'success.main',
                            }}
                          >
                            {formatDurationShort(m.totalLoadTime)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 2,
                            fontSize: 11,
                            color: 'text.secondary',
                          }}
                        >
                          <span>
                            <ClockIcon
                              size={10}
                              style={{ display: 'inline', marginRight: 2 }}
                            />
                            {i18n.t('microfrontend.observability_panel.k4')}: {formatDurationShort(m.whiteScreenTime)}
                          </span>
                          <span>FCP: {formatDurationShort(m.fcp)}</span>
                          <span>TTI: {formatDurationShort(m.tti)}</span>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary
                expandIcon={<ChevronDownIcon size={18} />}
                sx={{ minHeight: 40 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AlertIcon
                    size={16}
                    color={designTokens.colors.error.main}
                  />
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('microfrontend.observability_panel.k5')}
                  </Typography>
                  {totalErrors > 0 && (
                    <Chip
                      label={totalErrors}
                      size='small'
                      color='error'
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {!errorStats || totalErrors === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.observability_panel.k6')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        p: 1.5,
                        bgcolor: 'error.lighter',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 700, color: 'error.main' }}
                        >
                          {totalErrors}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('microfrontend.observability_panel.k7')}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 700, color: 'error.main' }}
                        >
                          {errorStats.totalErrorTypes}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('microfrontend.observability_panel.k8')}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 700, color: 'error.main' }}
                        >
                          {Object.keys(errorStats.errorsByModule).length}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('microfrontend.observability_panel.k9')}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, mt: 1 }}
                    >
                      {i18n.t('microfrontend.observability_panel.k10')}:
                    </Typography>
                    {Object.entries(errorStats.errorsByModule)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([moduleId, count]) => (
                        <Box
                          key={moduleId}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant='body2'>{moduleId}</Typography>
                          <Chip
                            label={count}
                            size='small'
                            color='error'
                            variant='outlined'
                            sx={{ height: 20 }}
                          />
                        </Box>
                      ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary
                expandIcon={<ChevronDownIcon size={18} />}
                sx={{ minHeight: 40 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EyeIcon
                    size={16}
                    color={designTokens.colors.secondary.main}
                  />
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('microfrontend.observability_panel.k11')}
                  </Typography>
                  <Chip
                    label={totalVisits}
                    size='small'
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: 'secondary.100',
                      color: 'secondary.600',
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {behaviorStats.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.observability_panel.k12')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {behaviorStats.slice(0, 5).map((s, idx) => (
                      <Box
                        key={s.moduleId}
                        sx={{
                          p: 1.5,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant='caption'
                              sx={{
                                fontWeight: 700,
                                color: idx < 3 ? 'primary.main' : 'text.secondary',
                                width: 20,
                              }}
                            >
                              #{idx + 1}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {s.moduleId}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={`${s.visitCount}${i18n.t('microfrontend.observability_panel.k21')}`}
                              size='small'
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 2,
                            fontSize: 11,
                            color: 'text.secondary',
                          }}
                        >
                          <span>
                            <TrendingUpIcon
                              size={10}
                              style={{ display: 'inline', marginRight: 2 }}
                            />
                            {i18n.t('microfrontend.observability_panel.k13')}: {formatDurationShort(s.averageDuration)}
                          </span>
                          <span>{i18n.t('microfrontend.observability_panel.sactionount_0', { s: { actionCount: s.actionCount } })}</span>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {slowModules.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'warning.lighter',
                  border: 1,
                  borderColor: 'warning.light',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AlertIcon
                    size={16}
                    color={designTokens.colors.warning.main}
                  />
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600, color: 'warning.dark' }}
                  >
                    {i18n.t('microfrontend.observability_panel.k14')}
                  </Typography>
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {slowModules.length}{i18n.t('microfrontend.observability_panel.k22')} {SLOW_MODULE_THRESHOLD}ms:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {slowModules.map((m) => (
                    <Chip
                      key={m.moduleId}
                      label={`${m.moduleId} (${formatDurationShort(m.totalLoadTime)})`}
                      size='small'
                      color='warning'
                      variant='outlined'
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          <Divider />
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('microfrontend.observability_panel.2_15')}
            </Typography>
            <Button
              size='small'
              onClick={refreshData}
            >
              {i18n.t('microfrontend.observability_panel.k16')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export { ObservabilityPanel };
export default ObservabilityPanel;
