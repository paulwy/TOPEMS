import React, { useState, useEffect } from 'react';
import { Settings, Database, FileText, RefreshCw, Save, Trash2, AlertCircle } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Grid, PageContainer } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { systemParamsApi } from '@/api/system';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { SystemConfig, CacheConfig, LogConfig } from '@/api/system/types';

const SystemParamsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);

  const [systemConfig, setSystemConfig] = useState<{
    site_name: string;
    site_description: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    secondary_color: string;
    enable_registration: boolean;
    enable_sso: boolean;
    default_role: string;
    max_upload_size: number;
    session_timeout_minutes: number;
    password_min_length: number;
    password_require_uppercase: boolean;
    password_require_lowercase: boolean;
    password_require_number: boolean;
    password_require_symbol: boolean;
    timezone: string;
    date_format: string;
    language: string;
  }>({
    site_name: '',
    site_description: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '',
    secondary_color: '',
    enable_registration: false,
    enable_sso: false,
    default_role: '',
    max_upload_size: 10,
    session_timeout_minutes: 30,
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_number: true,
    password_require_symbol: false,
    timezone: 'Asia/Shanghai',
    date_format: 'YYYY-MM-DD',
    language: 'zh-CN',
  });

  const [cacheConfig, setCacheConfig] = useState<{
    enabled: boolean;
    provider: 'redis' | 'memory' | 'memcached';
    redis_host: string;
    redis_port: number;
    redis_db: number;
    default_ttl_seconds: number;
    max_memory_mb: number;
    compression_enabled: boolean;
    cache_prefix: string;
  }>({
    enabled: true,
    provider: 'redis',
    redis_host: '',
    redis_port: 6379,
    redis_db: 0,
    default_ttl_seconds: 3600,
    max_memory_mb: 512,
    compression_enabled: false,
    cache_prefix: 'topems:',
  });

  const [logConfig, setLogConfig] = useState<{
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    format: 'json' | 'text';
    output: 'console' | 'file' | 'both';
    file_path: string;
    max_file_size_mb: number;
    max_files: number;
    log_to_db: boolean;
    console_enabled: boolean;
    remote_logging_enabled: boolean;
    remote_logging_url: string;
  }>({
    level: 'info',
    format: 'json',
    output: 'both',
    file_path: '',
    max_file_size_mb: 100,
    max_files: 10,
    log_to_db: false,
    console_enabled: true,
    remote_logging_enabled: false,
    remote_logging_url: '',
  });

  const systemConfigQuery = useQuery({
    queryKey: QUERY_KEYS.SYSTEM.CONFIG,
    queryFn: async () => {
      const res = await systemParamsApi.getSystemConfig();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const cacheConfigQuery = useQuery({
    queryKey: QUERY_KEYS.SYSTEM.CACHE_CONFIG,
    queryFn: async () => {
      const res = await systemParamsApi.getCacheConfig();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const logConfigQuery = useQuery({
    queryKey: QUERY_KEYS.SYSTEM.LOG_CONFIG,
    queryFn: async () => {
      const res = await systemParamsApi.getLogConfig();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const cacheStatsQuery = useQuery({
    queryKey: QUERY_KEYS.SYSTEM.CACHE_STATS,
    queryFn: async () => {
      const res = await systemParamsApi.getCacheStats();
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    },
    staleTime: 30 * 1000,
    enabled: cacheConfig.enabled,
  });

  useEffect(() => {
    if (systemConfigQuery.isSuccess && systemConfigQuery.data) {
      const data = systemConfigQuery.data as SystemConfig;
      setSystemConfig({
        site_name: data.site_name || '',
        site_description: data.site_description || '',
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        primary_color: data.primary_color || '',
        secondary_color: data.secondary_color || '',
        enable_registration: data.enable_registration ?? false,
        enable_sso: data.enable_sso ?? false,
        default_role: data.default_role || '',
        max_upload_size: data.max_upload_size ?? 10,
        session_timeout_minutes: data.session_timeout_minutes ?? 30,
        password_min_length: data.password_min_length ?? 8,
        password_require_uppercase: data.password_require_uppercase ?? true,
        password_require_lowercase: data.password_require_lowercase ?? true,
        password_require_number: data.password_require_number ?? true,
        password_require_symbol: data.password_require_symbol ?? false,
        timezone: data.timezone || 'Asia/Shanghai',
        date_format: data.date_format || 'YYYY-MM-DD',
        language: data.language || 'zh-CN',
      });
    }
  }, [systemConfigQuery.isSuccess, systemConfigQuery.data]);

  useEffect(() => {
    if (cacheConfigQuery.isSuccess && cacheConfigQuery.data) {
      const data = cacheConfigQuery.data as CacheConfig;
      setCacheConfig({
        enabled: data.enabled ?? true,
        provider: data.provider || 'redis',
        redis_host: data.redis_host || '',
        redis_port: data.redis_port ?? 6379,
        redis_db: data.redis_db ?? 0,
        default_ttl_seconds: data.default_ttl_seconds ?? 3600,
        max_memory_mb: data.max_memory_mb ?? 512,
        compression_enabled: data.compression_enabled ?? false,
        cache_prefix: data.cache_prefix || 'topems:',
      });
    }
  }, [cacheConfigQuery.isSuccess, cacheConfigQuery.data]);

  useEffect(() => {
    if (logConfigQuery.isSuccess && logConfigQuery.data) {
      const data = logConfigQuery.data as LogConfig;
      setLogConfig({
        level: data.level || 'info',
        format: data.format || 'json',
        output: data.output || 'both',
        file_path: data.file_path || '',
        max_file_size_mb: data.max_file_size_mb ?? 100,
        max_files: data.max_files ?? 10,
        log_to_db: data.log_to_db ?? false,
        console_enabled: data.console_enabled ?? true,
        remote_logging_enabled: data.remote_logging_enabled ?? false,
        remote_logging_url: data.remote_logging_url || '',
      });
    }
  }, [logConfigQuery.isSuccess, logConfigQuery.data]);

  const updateSystemConfigMutation = useMutation({
    mutationFn: (data: typeof systemConfig) => systemParamsApi.updateSystemConfig(data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '系统配置已更新',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.CONFIG });
    },
    onError: () => {
      addNotification({
        title: '错误',
        message: '更新系统配置失败',
        type: 'error',
      });
    },
  });

  const updateCacheConfigMutation = useMutation({
    mutationFn: (data: typeof cacheConfig) => systemParamsApi.updateCacheConfig(data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '缓存配置已更新',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.CACHE_CONFIG });
    },
    onError: () => {
      addNotification({
        title: '错误',
        message: '更新缓存配置失败',
        type: 'error',
      });
    },
  });

  const updateLogConfigMutation = useMutation({
    mutationFn: (data: typeof logConfig) => systemParamsApi.updateLogConfig(data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '日志配置已更新',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.LOG_CONFIG });
    },
    onError: () => {
      addNotification({
        title: '错误',
        message: '更新日志配置失败',
        type: 'error',
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => systemParamsApi.clearCache(),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '缓存已清除',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.CACHE_STATS });
    },
    onError: () => {
      addNotification({
        title: '错误',
        message: '清除缓存失败',
        type: 'error',
      });
    },
  });

  const handleSaveSystemConfig = () => {
    updateSystemConfigMutation.mutate(systemConfig);
  };

  const handleSaveCacheConfig = () => {
    updateCacheConfigMutation.mutate(cacheConfig);
  };

  const handleSaveLogConfig = () => {
    updateLogConfigMutation.mutate(logConfig);
  };

  const handleClearCache = () => {
    clearCacheMutation.mutate();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.CONFIG });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.CACHE_CONFIG });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.LOG_CONFIG });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.CACHE_STATS });
  };

  const loading =
    systemConfigQuery.isLoading || cacheConfigQuery.isLoading || logConfigQuery.isLoading;

  return (
    <PageContainer
      title='系统参数管理'
      subtitle='管理系统配置、缓存和日志参数'
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: handleRefresh,
            variant: 'outlined',
          },
        ],
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3 }}
            variant='fullWidth'
          >
            <Tab
              icon={<Settings size={18} />}
              label='系统配置'
            />
            <Tab
              icon={<Database size={18} />}
              label='缓存管理'
            />
            <Tab
              icon={<FileText size={18} />}
              label='日志配置'
            />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                        }}
                      >
                        <Settings size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          基本信息
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          站点名称、描述和图标配置
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='站点名称'
                        value={systemConfig.site_name}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            site_name: e.target.value,
                          }))
                        }
                        placeholder='输入站点名称'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='站点描述'
                        value={systemConfig.site_description}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            site_description: e.target.value,
                          }))
                        }
                        placeholder='输入站点描述'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='Logo URL'
                        value={systemConfig.logo_url}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            logo_url: e.target.value,
                          }))
                        }
                        placeholder='https://example.com/logo.png'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='Favicon URL'
                        value={systemConfig.favicon_url}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            favicon_url: e.target.value,
                          }))
                        }
                        placeholder='https://example.com/favicon.ico'
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'success.light',
                          color: 'success.main',
                        }}
                      >
                        <Settings size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          外观配置
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          主题颜色和界面设置
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='主色调'
                        value={systemConfig.primary_color}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            primary_color: e.target.value,
                          }))
                        }
                        placeholder='#1890ff'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='次色调'
                        value={systemConfig.secondary_color}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            secondary_color: e.target.value,
                          }))
                        }
                        placeholder='#722ed1'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControl fullWidth>
                        <InputLabel>时区</InputLabel>
                        <Select
                          value={systemConfig.timezone}
                          label='时区'
                          onChange={(e) =>
                            setSystemConfig((prev) => ({
                              ...prev,
                              timezone: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value='Asia/Shanghai'>亚洲/上海 (UTC+8)</MenuItem>
                          <MenuItem value='Asia/Tokyo'>亚洲/东京 (UTC+9)</MenuItem>
                          <MenuItem value='Europe/London'>欧洲/伦敦 (UTC+0)</MenuItem>
                          <MenuItem value='America/New_York'>美洲/纽约 (UTC-5)</MenuItem>
                          <MenuItem value='America/Los_Angeles'>美洲/洛杉矶 (UTC-8)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControl fullWidth>
                        <InputLabel>语言</InputLabel>
                        <Select
                          value={systemConfig.language}
                          label='语言'
                          onChange={(e) =>
                            setSystemConfig((prev) => ({
                              ...prev,
                              language: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value='zh-CN'>中文 (简体)</MenuItem>
                          <MenuItem value='zh-TW'>中文 (繁体)</MenuItem>
                          <MenuItem value='en-US'>English</MenuItem>
                          <MenuItem value='ja-JP'>日本語</MenuItem>
                          <MenuItem value='ko-KR'>한국어</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'warning.light',
                          color: 'warning.main',
                        }}
                      >
                        <Settings size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          安全配置
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          用户认证和密码策略
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={systemConfig.enable_registration}
                            onChange={(e) =>
                              setSystemConfig((prev) => ({
                                ...prev,
                                enable_registration: e.target.checked,
                              }))
                            }
                          />
                        }
                        label='允许用户注册'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={systemConfig.enable_sso}
                            onChange={(e) =>
                              setSystemConfig((prev) => ({
                                ...prev,
                                enable_sso: e.target.checked,
                              }))
                            }
                          />
                        }
                        label='启用单点登录'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='默认角色'
                        value={systemConfig.default_role}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            default_role: e.target.value,
                          }))
                        }
                        placeholder='user'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='会话超时(分钟)'
                        type='number'
                        value={systemConfig.session_timeout_minutes}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            session_timeout_minutes: parseInt(e.target.value) || 30,
                          }))
                        }
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='密码最小长度'
                        type='number'
                        value={systemConfig.password_min_length}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            password_min_length: parseInt(e.target.value) || 8,
                          }))
                        }
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='最大上传大小(MB)'
                        type='number'
                        value={systemConfig.max_upload_size}
                        onChange={(e) =>
                          setSystemConfig((prev) => ({
                            ...prev,
                            max_upload_size: parseInt(e.target.value) || 10,
                          }))
                        }
                      />
                    </Grid>
                    <Grid xs={12}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        密码复杂度要求
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={systemConfig.password_require_uppercase}
                              onChange={(e) =>
                                setSystemConfig((prev) => ({
                                  ...prev,
                                  password_require_uppercase: e.target.checked,
                                }))
                              }
                            />
                          }
                          label='需要大写字母'
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={systemConfig.password_require_lowercase}
                              onChange={(e) =>
                                setSystemConfig((prev) => ({
                                  ...prev,
                                  password_require_lowercase: e.target.checked,
                                }))
                              }
                            />
                          }
                          label='需要小写字母'
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={systemConfig.password_require_number}
                              onChange={(e) =>
                                setSystemConfig((prev) => ({
                                  ...prev,
                                  password_require_number: e.target.checked,
                                }))
                              }
                            />
                          }
                          label='需要数字'
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={systemConfig.password_require_symbol}
                              onChange={(e) =>
                                setSystemConfig((prev) => ({
                                  ...prev,
                                  password_require_symbol: e.target.checked,
                                }))
                              }
                            />
                          }
                          label='需要特殊字符'
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant='contained'
                  startIcon={<Save size={16} />}
                  onClick={handleSaveSystemConfig}
                  disabled={updateSystemConfigMutation.isPending}
                >
                  {updateSystemConfigMutation.isPending ? '保存中...' : '保存配置'}
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                        }}
                      >
                        <Database size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          缓存状态
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          当前缓存使用情况统计
                        </Typography>
                      </Box>
                    </Box>
                  }
                  action={
                    <Button
                      size='small'
                      color='error'
                      startIcon={<Trash2 size={16} />}
                      onClick={handleClearCache}
                      disabled={clearCacheMutation.isPending || !cacheConfig.enabled}
                    >
                      {clearCacheMutation.isPending ? '清除中...' : '清除缓存'}
                    </Button>
                  }
                />
                <CardContent>
                  {cacheConfig.enabled ? (
                    cacheStatsQuery.isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                      </Box>
                    ) : cacheStatsQuery.data ? (
                      <Grid
                        container
                        spacing={3}
                      >
                        <Grid
                          xs={12}
                          sm={4}
                        >
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 2,
                              bgcolor: 'grey.50',
                              textAlign: 'center',
                            }}
                          >
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 600 }}
                            >
                              {cacheStatsQuery.data.keys_count.toLocaleString()}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary', mt: 1 }}
                            >
                              缓存键数量
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid
                          xs={12}
                          sm={4}
                        >
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 2,
                              bgcolor: 'grey.50',
                              textAlign: 'center',
                            }}
                          >
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 600 }}
                            >
                              {cacheStatsQuery.data.memory_used_mb.toFixed(2)}
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 400,
                                  marginLeft: 4,
                                }}
                              >
                                MB
                              </span>
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary', mt: 1 }}
                            >
                              内存使用
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid
                          xs={12}
                          sm={4}
                        >
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 2,
                              bgcolor: 'grey.50',
                              textAlign: 'center',
                            }}
                          >
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 600 }}
                            >
                              {((cacheStatsQuery.data.hit_rate || 0) * 100).toFixed(1)}
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 400,
                                  marginLeft: 4,
                                }}
                              >
                                %
                              </span>
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary', mt: 1 }}
                            >
                              命中率
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    ) : (
                      <Alert severity='info'>无法获取缓存统计信息</Alert>
                    )
                  ) : (
                    <Alert severity='warning'>缓存未启用，请先启用缓存功能</Alert>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'success.light',
                          color: 'success.main',
                        }}
                      >
                        <Database size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          缓存设置
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          缓存引擎和参数配置
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={cacheConfig.enabled}
                            onChange={(e) =>
                              setCacheConfig((prev) => ({
                                ...prev,
                                enabled: e.target.checked,
                              }))
                            }
                          />
                        }
                        label='启用缓存'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControl fullWidth>
                        <InputLabel>缓存提供者</InputLabel>
                        <Select
                          value={cacheConfig.provider}
                          label='缓存提供者'
                          onChange={(e) =>
                            setCacheConfig((prev) => ({
                              ...prev,
                              provider: e.target.value as typeof cacheConfig.provider,
                            }))
                          }
                          disabled={!cacheConfig.enabled}
                        >
                          <MenuItem value='redis'>Redis</MenuItem>
                          <MenuItem value='memory'>内存</MenuItem>
                          <MenuItem value='memcached'>Memcached</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='缓存前缀'
                        value={cacheConfig.cache_prefix}
                        onChange={(e) =>
                          setCacheConfig((prev) => ({
                            ...prev,
                            cache_prefix: e.target.value,
                          }))
                        }
                        disabled={!cacheConfig.enabled}
                      />
                    </Grid>
                    {cacheConfig.provider === 'redis' && (
                      <>
                        <Divider sx={{ width: '100%', my: 2 }} />
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600, width: '100%', mb: 2 }}
                        >
                          Redis 连接配置
                        </Typography>
                        <Grid
                          xs={12}
                          sm={6}
                        >
                          <TextField
                            fullWidth
                            label='Redis 主机'
                            value={cacheConfig.redis_host}
                            onChange={(e) =>
                              setCacheConfig((prev) => ({
                                ...prev,
                                redis_host: e.target.value,
                              }))
                            }
                            disabled={!cacheConfig.enabled}
                          />
                        </Grid>
                        <Grid
                          xs={12}
                          sm={6}
                        >
                          <TextField
                            fullWidth
                            label='Redis 端口'
                            type='number'
                            value={cacheConfig.redis_port}
                            onChange={(e) =>
                              setCacheConfig((prev) => ({
                                ...prev,
                                redis_port: parseInt(e.target.value) || 6379,
                              }))
                            }
                            disabled={!cacheConfig.enabled}
                          />
                        </Grid>
                        <Grid
                          xs={12}
                          sm={6}
                        >
                          <TextField
                            fullWidth
                            label='Redis 数据库'
                            type='number'
                            value={cacheConfig.redis_db}
                            onChange={(e) =>
                              setCacheConfig((prev) => ({
                                ...prev,
                                redis_db: parseInt(e.target.value) || 0,
                              }))
                            }
                            disabled={!cacheConfig.enabled}
                          />
                        </Grid>
                      </>
                    )}
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='默认TTL(秒)'
                        type='number'
                        value={cacheConfig.default_ttl_seconds}
                        onChange={(e) =>
                          setCacheConfig((prev) => ({
                            ...prev,
                            default_ttl_seconds: parseInt(e.target.value) || 3600,
                          }))
                        }
                        disabled={!cacheConfig.enabled}
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='最大内存(MB)'
                        type='number'
                        value={cacheConfig.max_memory_mb}
                        onChange={(e) =>
                          setCacheConfig((prev) => ({
                            ...prev,
                            max_memory_mb: parseInt(e.target.value) || 512,
                          }))
                        }
                        disabled={!cacheConfig.enabled}
                      />
                    </Grid>
                    <Grid xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={cacheConfig.compression_enabled}
                            onChange={(e) =>
                              setCacheConfig((prev) => ({
                                ...prev,
                                compression_enabled: e.target.checked,
                              }))
                            }
                            disabled={!cacheConfig.enabled}
                          />
                        }
                        label='启用压缩'
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant='contained'
                  startIcon={<Save size={16} />}
                  onClick={handleSaveCacheConfig}
                  disabled={updateCacheConfigMutation.isPending}
                >
                  {updateCacheConfigMutation.isPending ? '保存中...' : '保存配置'}
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                        }}
                      >
                        <FileText size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          日志级别和格式
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          控制日志输出级别和格式
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControl fullWidth>
                        <InputLabel>日志级别</InputLabel>
                        <Select
                          value={logConfig.level}
                          label='日志级别'
                          onChange={(e) =>
                            setLogConfig((prev) => ({
                              ...prev,
                              level: e.target.value as typeof logConfig.level,
                            }))
                          }
                        >
                          <MenuItem value='trace'>Trace</MenuItem>
                          <MenuItem value='debug'>Debug</MenuItem>
                          <MenuItem value='info'>Info</MenuItem>
                          <MenuItem value='warn'>Warn</MenuItem>
                          <MenuItem value='error'>Error</MenuItem>
                          <MenuItem value='fatal'>Fatal</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControl fullWidth>
                        <InputLabel>日志格式</InputLabel>
                        <Select
                          value={logConfig.format}
                          label='日志格式'
                          onChange={(e) =>
                            setLogConfig((prev) => ({
                              ...prev,
                              format: e.target.value as typeof logConfig.format,
                            }))
                          }
                        >
                          <MenuItem value='json'>JSON</MenuItem>
                          <MenuItem value='text'>文本</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControl fullWidth>
                        <InputLabel>输出方式</InputLabel>
                        <Select
                          value={logConfig.output}
                          label='输出方式'
                          onChange={(e) =>
                            setLogConfig((prev) => ({
                              ...prev,
                              output: e.target.value as typeof logConfig.output,
                            }))
                          }
                        >
                          <MenuItem value='console'>仅控制台</MenuItem>
                          <MenuItem value='file'>仅文件</MenuItem>
                          <MenuItem value='both'>控制台和文件</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={logConfig.log_to_db}
                            onChange={(e) =>
                              setLogConfig((prev) => ({
                                ...prev,
                                log_to_db: e.target.checked,
                              }))
                            }
                          />
                        }
                        label='记录到数据库'
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'warning.light',
                          color: 'warning.main',
                        }}
                      >
                        <FileText size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          文件输出配置
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          日志文件存储路径和滚动策略
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={logConfig.output !== 'console'}
                            disabled
                          />
                        }
                        label={
                          <span>
                            文件输出
                            <Chip
                              label={logConfig.output === 'console' ? '已禁用' : '已启用'}
                              size='small'
                              sx={{ ml: 2 }}
                              color={logConfig.output === 'console' ? 'default' : 'success'}
                            />
                          </span>
                        }
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='日志文件路径'
                        value={logConfig.file_path}
                        onChange={(e) =>
                          setLogConfig((prev) => ({
                            ...prev,
                            file_path: e.target.value,
                          }))
                        }
                        placeholder='/var/log/topems/app.log'
                        disabled={logConfig.output === 'console'}
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='单文件最大大小(MB)'
                        type='number'
                        value={logConfig.max_file_size_mb}
                        onChange={(e) =>
                          setLogConfig((prev) => ({
                            ...prev,
                            max_file_size_mb: parseInt(e.target.value) || 100,
                          }))
                        }
                        disabled={logConfig.output === 'console'}
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <TextField
                        fullWidth
                        label='保留文件数量'
                        type='number'
                        value={logConfig.max_files}
                        onChange={(e) =>
                          setLogConfig((prev) => ({
                            ...prev,
                            max_files: parseInt(e.target.value) || 10,
                          }))
                        }
                        disabled={logConfig.output === 'console'}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'error.light',
                          color: 'error.main',
                        }}
                      >
                        <AlertCircle size={20} />
                      </Box>
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          高级配置
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          控制台和远程日志配置
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={logConfig.console_enabled}
                            onChange={(e) =>
                              setLogConfig((prev) => ({
                                ...prev,
                                console_enabled: e.target.checked,
                              }))
                            }
                          />
                        }
                        label='控制台输出'
                      />
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={logConfig.remote_logging_enabled}
                            onChange={(e) =>
                              setLogConfig((prev) => ({
                                ...prev,
                                remote_logging_enabled: e.target.checked,
                              }))
                            }
                          />
                        }
                        label='远程日志'
                      />
                    </Grid>
                    <Grid xs={12}>
                      <TextField
                        fullWidth
                        label='远程日志URL'
                        value={logConfig.remote_logging_url}
                        onChange={(e) =>
                          setLogConfig((prev) => ({
                            ...prev,
                            remote_logging_url: e.target.value,
                          }))
                        }
                        placeholder='https://logs.example.com/api'
                        disabled={!logConfig.remote_logging_enabled}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant='contained'
                  startIcon={<Save size={16} />}
                  onClick={handleSaveLogConfig}
                  disabled={updateLogConfigMutation.isPending}
                >
                  {updateLogConfigMutation.isPending ? '保存中...' : '保存配置'}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default SystemParamsPage;
