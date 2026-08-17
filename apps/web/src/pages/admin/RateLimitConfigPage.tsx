import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Shield,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Activity,
  Globe,
  Users,
  Server,
  AlertCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { apiClient } from '@/api/client';
import { designTokens } from '@/theme/tokens';
import { extractErrorMessage } from '@/utils/errors';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;
interface RateLimitRule {
  requests: number;
  window_secs: number;
  priority: number;
}
interface PathRule {
  path: string;
  rule: RateLimitRule;
}
interface RateLimitConfig {
  enabled: boolean;
  by_tenant: boolean;
  by_user: boolean;
  by_ip: boolean;
  by_global: boolean;
  tenant_default: RateLimitRule;
  user_default: RateLimitRule;
  ip_default: RateLimitRule;
  global_default: RateLimitRule;
  path_rules: PathRule[];
  skip_paths: string[];
  updated_at?: string;
}
interface AntiReplayConfig {
  enabled: boolean;
  tolerance_secs: number;
  nonce_cache_secs: number;
  timestamp_header: string;
  nonce_header: string;
  enforce_paths: string[];
}
const DEFAULT_CONFIG: RateLimitConfig = {
  enabled: true,
  by_tenant: true,
  by_user: true,
  by_ip: true,
  by_global: true,
  tenant_default: { requests: 2000, window_secs: 60, priority: 0 },
  user_default: { requests: 500, window_secs: 60, priority: 0 },
  ip_default: { requests: 1000, window_secs: 60, priority: 0 },
  global_default: { requests: 50000, window_secs: 60, priority: 0 },
  path_rules: [],
  skip_paths: ['/health', '/api', '/api/info', '/metrics'],
};
const DEFAULT_ANTI_REPLAY: AntiReplayConfig = {
  enabled: false,
  tolerance_secs: 300,
  nonce_cache_secs: 600,
  timestamp_header: 'X-Request-Timestamp',
  nonce_header: 'X-Request-Nonce',
  enforce_paths: [],
};
const RateLimitConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [config, setConfig] = useState<RateLimitConfig>(DEFAULT_CONFIG);
  const [antiReplay, setAntiReplay] = useState<AntiReplayConfig>(DEFAULT_ANTI_REPLAY);
  const [newPath, setNewPath] = useState('');
  const [newPathRequests, setNewPathRequests] = useState(200);
  const [newPathWindow, setNewPathWindow] = useState(60);
  const [newSkipPath, setNewSkipPath] = useState('');
  const [newEnforcePath, setNewEnforcePath] = useState('');
  const configQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_RATE_LIMIT_CONFIG_BASE,
    queryFn: async () => {
      const res = await apiClient.core.get<RateLimitConfig>('/api/core/iam/v1/rate-limit/config');
      if (res.success && res.data) {
        return res.data;
      }
      return DEFAULT_CONFIG;
    },
    staleTime: 30_000,
  });
  const antiReplayQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_ANTI_REPLAY_CONFIG_BASE,
    queryFn: async () => {
      const res = await apiClient.core.get<AntiReplayConfig>(
        '/api/core/iam/v1/rate-limit/config/anti-replay'
      );
      if (res.success && res.data) {
        return res.data;
      }
      return DEFAULT_ANTI_REPLAY;
    },
    staleTime: 30_000,
  });
  useEffect(() => {
    if (configQuery.data) {
      setConfig(configQuery.data);
    }
  }, [configQuery.data]);
  useEffect(() => {
    if (antiReplayQuery.data) {
      setAntiReplay(antiReplayQuery.data);
    }
  }, [antiReplayQuery.data]);
  const saveMutation = useMutation({
    mutationFn: async (next: RateLimitConfig) => {
      const res = await apiClient.core.put<RateLimitConfig>(
        '/api/core/iam/v1/rate-limit/config',
        next
      );
      return res;
    },
    onSuccess: (res) => {
      if (res.success) {
        addNotification({
          title: i18n.t('admin:rate_limit_config_page.save_success'),
          message: i18n.t('admin:rate_limit_config_page.rate_limit_config_updated'),
          type: 'success',
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_RATE_LIMIT_CONFIG_BASE,
          exact: false,
          refetchType: 'active',
        });
      } else {
        addNotification({
          title: i18n.t('admin:rate_limit_config_page.save_fail'),
          message:
            res.message || i18n.t('admin:rate_limit_config_page.rate_limit_config_save_fail'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('admin:rate_limit_config_page.log_save_rate_limit_fail'), err);
      addNotification({
        title: i18n.t('admin:rate_limit_config_page.save_fail'),
        message: extractErrorMessage(
          err,
          i18n.t('admin:rate_limit_config_page.save_rate_limit_fail')
        ),
        type: 'error',
      });
    },
  });
  const saveAntiReplayMutation = useMutation({
    mutationFn: async (next: AntiReplayConfig) => {
      const res = await apiClient.core.put<AntiReplayConfig>(
        '/api/core/iam/v1/rate-limit/config/anti-replay',
        next
      );
      return res;
    },
    onSuccess: (res) => {
      if (res.success) {
        addNotification({
          title: i18n.t('admin:rate_limit_config_page.save_success'),
          message: i18n.t('admin:rate_limit_config_page.anti_replay_config_updated'),
          type: 'success',
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_ANTI_REPLAY_CONFIG_BASE,
          exact: false,
          refetchType: 'active',
        });
      } else {
        addNotification({
          title: i18n.t('admin:rate_limit_config_page.save_fail'),
          message:
            res.message || i18n.t('admin:rate_limit_config_page.anti_replay_config_save_fail'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('admin:rate_limit_config_page.log_save_anti_replay_fail'), err);
      addNotification({
        title: i18n.t('admin:rate_limit_config_page.save_fail'),
        message: extractErrorMessage(
          err,
          i18n.t('admin:rate_limit_config_page.save_anti_replay_fail')
        ),
        type: 'error',
      });
    },
  });
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.core.post<RateLimitConfig>(
        '/api/core/iam/v1/rate-limit/config',
        {}
      );
      return res;
    },
    onSuccess: (res) => {
      if (res.success && res.data) {
        setConfig(res.data);
        addNotification({
          title: i18n.t('admin:rate_limit_config_page.reset_done'),
          message: i18n.t('admin:rate_limit_config_page.rate_limit_config_reset'),
          type: 'success',
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_RATE_LIMIT_CONFIG_BASE,
          exact: false,
          refetchType: 'active',
        });
      }
    },
  });
  const updateRule = (
    key: keyof Pick<
      RateLimitConfig,
      'tenant_default' | 'user_default' | 'ip_default' | 'global_default'
    >,
    field: keyof RateLimitRule,
    value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };
  const updateToggle = (key: keyof RateLimitConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleAddPath = () => {
    if (!newPath) return;
    setConfig((prev) => ({
      ...prev,
      path_rules: [
        ...prev.path_rules,
        {
          path: newPath,
          rule: {
            requests: newPathRequests,
            window_secs: newPathWindow,
            priority: 0,
          },
        },
      ],
    }));
    setNewPath('');
    setNewPathRequests(200);
    setNewPathWindow(60);
  };
  const handleRemovePath = (path: string) => {
    setConfig((prev) => ({
      ...prev,
      path_rules: prev.path_rules.filter((r) => r.path !== path),
    }));
  };
  const handleAddSkipPath = () => {
    if (!newSkipPath) return;
    if (config.skip_paths.includes(newSkipPath)) return;
    setConfig((prev) => ({ ...prev, skip_paths: [...prev.skip_paths, newSkipPath] }));
    setNewSkipPath('');
  };
  const handleRemoveSkipPath = (path: string) => {
    setConfig((prev) => ({
      ...prev,
      skip_paths: prev.skip_paths.filter((p) => p !== path),
    }));
  };
  const handleAddEnforcePath = () => {
    if (!newEnforcePath) return;
    if (antiReplay.enforce_paths.includes(newEnforcePath)) return;
    setAntiReplay((prev) => ({ ...prev, enforce_paths: [...prev.enforce_paths, newEnforcePath] }));
    setNewEnforcePath('');
  };
  const handleRemoveEnforcePath = (path: string) => {
    setAntiReplay((prev) => ({
      ...prev,
      enforce_paths: prev.enforce_paths.filter((p) => p !== path),
    }));
  };
  const handleSave = () => {
    saveMutation.mutate(config);
  };
  const handleReset = () => {
    if (window.confirm(i18n.t('admin:rate_limit_config_page.confirm_reset'))) {
      resetMutation.mutate();
    }
  };
  const handleSaveAntiReplay = () => {
    saveAntiReplayMutation.mutate(antiReplay);
  };
  const dimensions = useMemo(
    () => [
      {
        key: 'tenant_default' as const,
        title: i18n.t('admin:rate_limit_config_page.dimension_tenant'),
        icon: <Server size={18} />,
        color: ct.primary.dark,
        description: i18n.t('admin:rate_limit_config_page.dimension_tenant_desc'),
      },
      {
        key: 'user_default' as const,
        title: i18n.t('admin:rate_limit_config_page.dimension_user'),
        icon: <Users size={18} />,
        color: ct.info.dark,
        description: i18n.t('admin:rate_limit_config_page.dimension_user_desc'),
      },
      {
        key: 'ip_default' as const,
        title: i18n.t('admin:rate_limit_config_page.dimension_ip'),
        icon: <Globe size={18} />,
        color: ct.success.dark,
        description: i18n.t('admin:rate_limit_config_page.dimension_ip_desc'),
      },
      {
        key: 'global_default' as const,
        title: i18n.t('admin:rate_limit_config_page.dimension_global'),
        icon: <Shield size={18} />,
        color: ct.warning.dark,
        description: i18n.t('admin:rate_limit_config_page.dimension_global_desc'),
      },
    ],
    [i18n.t]
  );
  return (
    <PageContainer
      title={i18n.t('admin:rate_limit_config_page.title')}
      subtitle={i18n.t('admin:rate_limit_config_page.subtitle')}
      headerProps={{
        backButton: { href: '/admin/system' },
        pageIcon: <Shield size={20} />,
        pageColor: ct.warning.dark,
      }}
      maxWidth='xl'
    >
      <Grid
        container
        spacing={3}
      >
        {/* 总开关 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Activity
                  size={24}
                  color={ct.warning.dark}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('admin:rate_limit_config_page.enable_rate_limit')}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('admin:rate_limit_config_page.enable_rate_limit_desc')}
                  </Typography>
                </Box>
                <Switch
                  checked={config.enabled}
                  onChange={() => updateToggle('enabled')}
                  color='primary'
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* 维度开关 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('admin:rate_limit_config_page.dimensions_title')}
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  {
                    key: 'by_tenant',
                    label: i18n.t('admin:rate_limit_config_page.dim_tenant'),
                    desc: i18n.t('admin:rate_limit_config_page.dim_tenant_desc'),
                  },
                  {
                    key: 'by_user',
                    label: i18n.t('admin:rate_limit_config_page.dim_user'),
                    desc: i18n.t('admin:rate_limit_config_page.dim_user_desc'),
                  },
                  {
                    key: 'by_ip',
                    label: 'IP',
                    desc: i18n.t('admin:rate_limit_config_page.dim_ip_desc'),
                  },
                  {
                    key: 'by_global',
                    label: i18n.t('admin:rate_limit_config_page.dim_global'),
                    desc: i18n.t('admin:rate_limit_config_page.dim_global_desc'),
                  },
                ].map((dim) => (
                  <Grid
                    size={{ xs: 6, sm: 3 }}
                    key={dim.key}
                  >
                    <Paper
                      variant='outlined'
                      sx={{ p: 2 }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config[dim.key as keyof RateLimitConfig] as boolean}
                            onChange={() => updateToggle(dim.key as keyof RateLimitConfig)}
                            color='primary'
                          />
                        }
                        label={
                          <Box>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600 }}
                            >
                              {dim.label}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {dim.desc}
                            </Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        {/* 默认规则 */}
        {dimensions.map((dim) => {
          const rule = config[dim.key];
          return (
            <Grid
              size={{ xs: 12, md: 6 }}
              key={dim.key}
            >
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${dim.color}15`,
                        color: dim.color,
                      }}
                    >
                      {dim.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600 }}
                      >
                        {dim.title}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {dim.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Grid
                    container
                    spacing={2}
                  >
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label={i18n.t('admin:rate_limit_config_page.label_max_requests')}
                        type='number'
                        fullWidth
                        value={rule.requests}
                        onChange={(e) =>
                          updateRule(dim.key, 'requests', Number(e.target.value) || 0)
                        }
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position='end'>
                                {i18n.t('admin:rate_limit_config_page.unit_times')}
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label={i18n.t('admin:rate_limit_config_page.label_time_window')}
                        type='number'
                        fullWidth
                        value={rule.window_secs}
                        onChange={(e) =>
                          updateRule(dim.key, 'window_secs', Number(e.target.value) || 1)
                        }
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position='end'>
                                {i18n.t('admin:rate_limit_config_page.unit_seconds')}
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label={i18n.t('admin:rate_limit_config_page.label_priority')}
                        type='number'
                        fullWidth
                        value={rule.priority}
                        onChange={(e) =>
                          updateRule(dim.key, 'priority', Number(e.target.value) || 0)
                        }
                        helperText={i18n.t('admin:rate_limit_config_page.priority_helper')}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {/* 路径规则 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('admin:rate_limit_config_page.path_rules_title')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label={i18n.t('admin:rate_limit_config_page.label_path_prefix')}
                  size='small'
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder='/api/core/iam'
                  sx={{ minWidth: 240 }}
                />
                <TextField
                  label={i18n.t('admin:rate_limit_config_page.label_requests')}
                  type='number'
                  size='small'
                  value={newPathRequests}
                  onChange={(e) => setNewPathRequests(Number(e.target.value) || 0)}
                />
                <TextField
                  label={i18n.t('admin:rate_limit_config_page.label_window_seconds')}
                  type='number'
                  size='small'
                  value={newPathWindow}
                  onChange={(e) => setNewPathWindow(Number(e.target.value) || 1)}
                />
                <Button
                  variant='contained'
                  startIcon={<Plus size={16} />}
                  onClick={handleAddPath}
                >
                  {i18n.t('admin:rate_limit_config_page.add_rule')}
                </Button>
              </Box>
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        {i18n.t('admin:rate_limit_config_page.label_path_prefix')}
                      </TableCell>
                      <TableCell>{i18n.t('admin:rate_limit_config_page.label_requests')}</TableCell>
                      <TableCell>
                        {i18n.t('admin:rate_limit_config_page.label_window_seconds')}
                      </TableCell>
                      <TableCell align='right'>
                        {i18n.t('admin:rate_limit_config_page.col_action')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {config.path_rules.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align='center'
                        >
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ py: 2 }}
                          >
                            {i18n.t('admin:rate_limit_config_page.no_custom_rules')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      config.path_rules.map((rule) => (
                        <TableRow key={rule.path}>
                          <TableCell>
                            <Chip
                              label={rule.path}
                              size='small'
                            />
                          </TableCell>
                          <TableCell>{rule.rule.requests}</TableCell>
                          <TableCell>{rule.rule.window_secs}</TableCell>
                          <TableCell align='right'>
                            <Tooltip title={i18n.t('admin:rate_limit_config_page.delete')}>
                              <IconButton
                                size='small'
                                onClick={() => handleRemovePath(rule.path)}
                                aria-label={i18n.t('admin:rate_limit_config_page.delete')}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        {/* 跳过路径 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('admin:rate_limit_config_page.skip_paths_title')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size='small'
                  fullWidth
                  value={newSkipPath}
                  onChange={(e) => setNewSkipPath(e.target.value)}
                  placeholder='/health'
                />
                <Button
                  variant='outlined'
                  onClick={handleAddSkipPath}
                >
                  {i18n.t('admin:rate_limit_config_page.add')}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {config.skip_paths.map((path) => (
                  <Chip
                    key={path}
                    label={path}
                    onDelete={() => handleRemoveSkipPath(path)}
                    size='small'
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* 防重放配置 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AlertCircle
                  size={20}
                  color={ct.warning.dark}
                />
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('admin:rate_limit_config_page.anti_replay_title')}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Switch
                  checked={antiReplay.enabled}
                  onChange={() => setAntiReplay((prev) => ({ ...prev, enabled: !prev.enabled }))}
                />
              </Box>
              <Grid
                container
                spacing={2}
              >
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label={i18n.t('admin:rate_limit_config_page.label_tolerance_secs')}
                    type='number'
                    fullWidth
                    size='small'
                    value={antiReplay.tolerance_secs}
                    onChange={(e) =>
                      setAntiReplay((prev) => ({
                        ...prev,
                        tolerance_secs: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label={i18n.t('admin:rate_limit_config_page.label_nonce_cache_secs')}
                    type='number'
                    fullWidth
                    size='small'
                    value={antiReplay.nonce_cache_secs}
                    onChange={(e) =>
                      setAntiReplay((prev) => ({
                        ...prev,
                        nonce_cache_secs: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label={i18n.t('admin:rate_limit_config_page.label_timestamp_header')}
                    fullWidth
                    size='small'
                    value={antiReplay.timestamp_header}
                    onChange={(e) =>
                      setAntiReplay((prev) => ({
                        ...prev,
                        timestamp_header: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label='nonce Header'
                    fullWidth
                    size='small'
                    value={antiReplay.nonce_header}
                    onChange={(e) =>
                      setAntiReplay((prev) => ({
                        ...prev,
                        nonce_header: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    variant='body2'
                    sx={{ mb: 1, fontWeight: 500 }}
                  >
                    {i18n.t('admin:rate_limit_config_page.enforce_paths_title')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size='small'
                      fullWidth
                      value={newEnforcePath}
                      onChange={(e) => setNewEnforcePath(e.target.value)}
                      placeholder='/api/core/finance'
                    />
                    <Button
                      variant='outlined'
                      onClick={handleAddEnforcePath}
                    >
                      {i18n.t('admin:rate_limit_config_page.add')}
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {antiReplay.enforce_paths.map((path) => (
                      <Chip
                        key={path}
                        label={path}
                        onDelete={() => handleRemoveEnforcePath(path)}
                        size='small'
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant='outlined'
                    startIcon={<Save size={16} />}
                    onClick={handleSaveAntiReplay}
                    disabled={saveAntiReplayMutation.isPending}
                  >
                    {i18n.t('admin:rate_limit_config_page.save_anti_replay')}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        {/* 操作按钮 */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant='outlined'
              color='error'
              startIcon={<RotateCcw size={16} />}
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              {i18n.t('admin:rate_limit_config_page.reset_to_default')}
            </Button>
            <Button
              variant='contained'
              startIcon={saveMutation.isPending ? undefined : <Save size={16} />}
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? i18n.t('admin:rate_limit_config_page.saving')
                : i18n.t('admin:rate_limit_config_page.save_config')}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};
export default RateLimitConfigPage;
