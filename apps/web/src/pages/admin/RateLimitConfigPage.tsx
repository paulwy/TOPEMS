import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
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
  Check,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer, BackButton } from '@/components/common';
import { apiClient } from '@/api/client';
import { designTokens } from '@/theme/tokens';
import { extractErrorMessage } from '@/utils/errors';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

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
    queryKey: ['admin-rate-limit-config'],
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
    queryKey: ['admin-anti-replay-config'],
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
          title: '保存成功',
          message: '限流配置已更新',
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
      } else {
        addNotification({
          title: '保存失败',
          message: res.message || '限流配置保存失败',
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('保存限流配置失败:', err);
      addNotification({
        title: '保存失败',
        message: extractErrorMessage(err, '保存限流配置失败'),
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
          title: '保存成功',
          message: '防重放配置已更新',
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: ['admin-anti-replay-config'] });
      } else {
        addNotification({
          title: '保存失败',
          message: res.message || '防重放配置保存失败',
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('保存防重放配置失败:', err);
      addNotification({
        title: '保存失败',
        message: extractErrorMessage(err, '保存防重放配置失败'),
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
          title: '已重置',
          message: '限流配置已重置为默认值',
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
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
    if (window.confirm('确定要重置为默认配置吗？')) {
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
        title: '租户维度',
        icon: <Server size={18} />,
        color: ct.primary.dark,
        description: '按租户 ID 限流，控制单租户整体访问频率',
      },
      {
        key: 'user_default' as const,
        title: '用户维度',
        icon: <Users size={18} />,
        color: ct.info.dark,
        description: '按用户 ID 限流，防止单个账号过度请求',
      },
      {
        key: 'ip_default' as const,
        title: 'IP 维度',
        icon: <Globe size={18} />,
        color: ct.success.dark,
        description: '按客户端 IP 限流，抵御自动化攻击',
      },
      {
        key: 'global_default' as const,
        title: '全局维度',
        icon: <Shield size={18} />,
        color: ct.warning.dark,
        description: '兜底限流，保护后端服务的最大吞吐',
      },
    ],
    []
  );

  return (
    <PageContainer
      title='限流配置'
      subtitle='多维度限流策略与防重放保护'
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
                    启用限流
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    关闭后所有限流规则将不再生效（防重放仍可独立控制）
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
                限流维度
              </Typography>
              <Grid
                container
                spacing={2}
              >
                {[
                  { key: 'by_tenant', label: '租户', desc: '按 tenant_id' },
                  { key: 'by_user', label: '用户', desc: '按 user_id' },
                  { key: 'by_ip', label: 'IP', desc: '按客户端 IP' },
                  { key: 'by_global', label: '全局', desc: '兜底规则' },
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
                        label='允许请求数'
                        type='number'
                        fullWidth
                        value={rule.requests}
                        onChange={(e) =>
                          updateRule(dim.key, 'requests', Number(e.target.value) || 0)
                        }
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position='end'>次</InputAdornment>,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label='时间窗口'
                        type='number'
                        fullWidth
                        value={rule.window_secs}
                        onChange={(e) =>
                          updateRule(dim.key, 'window_secs', Number(e.target.value) || 1)
                        }
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position='end'>秒</InputAdornment>,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label='优先级'
                        type='number'
                        fullWidth
                        value={rule.priority}
                        onChange={(e) =>
                          updateRule(dim.key, 'priority', Number(e.target.value) || 0)
                        }
                        helperText='数值越大优先级越高'
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
                路径级自定义规则
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label='路径前缀'
                  size='small'
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder='/api/core/iam'
                  sx={{ minWidth: 240 }}
                />
                <TextField
                  label='请求数'
                  type='number'
                  size='small'
                  value={newPathRequests}
                  onChange={(e) => setNewPathRequests(Number(e.target.value) || 0)}
                />
                <TextField
                  label='窗口(秒)'
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
                  添加规则
                </Button>
              </Box>
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>路径前缀</TableCell>
                      <TableCell>请求数</TableCell>
                      <TableCell>窗口(秒)</TableCell>
                      <TableCell align='right'>操作</TableCell>
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
                            暂无自定义规则
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
                            <Tooltip title='删除'>
                              <IconButton
                                size='small'
                                onClick={() => handleRemovePath(rule.path)}
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
                跳过路径
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
                  添加
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
                  防重放保护
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
                    label='时间戳容差(秒)'
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
                    label='nonce 缓存(秒)'
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
                    label='时间戳 Header'
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
                    强制启用防重放的路径
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
                      添加
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
                    保存防重放配置
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
              重置为默认
            </Button>
            <Button
              variant='contained'
              startIcon={saveMutation.isPending ? undefined : <Save size={16} />}
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? '保存中...' : '保存配置'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default RateLimitConfigPage;
