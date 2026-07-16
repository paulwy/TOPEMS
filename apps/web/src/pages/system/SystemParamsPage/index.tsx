import React, { useState, useEffect } from 'react';
import { Settings, Database, FileText, RefreshCw } from 'lucide-react';
import {
  Box,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { systemParamsApi } from '@/api/system';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { SystemConfig, CacheConfig, LogConfig } from '@/api/system/types';
import SystemConfigPanel from './components/SystemConfigPanel';
import CacheConfigPanel from './components/CacheConfigPanel';
import LogConfigPanel from './components/LogConfigPanel';

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
            <SystemConfigPanel
              systemConfig={systemConfig}
              setSystemConfig={setSystemConfig}
              onSave={handleSaveSystemConfig}
              isSaving={updateSystemConfigMutation.isPending}
            />
          )}

          {activeTab === 1 && (
            <CacheConfigPanel
              cacheConfig={cacheConfig}
              setCacheConfig={setCacheConfig}
              onSave={handleSaveCacheConfig}
              isSaving={updateCacheConfigMutation.isPending}
              cacheStats={cacheStatsQuery.data}
              isLoadingStats={cacheStatsQuery.isLoading}
              onClearCache={handleClearCache}
              isClearingCache={clearCacheMutation.isPending}
            />
          )}

          {activeTab === 2 && (
            <LogConfigPanel
              logConfig={logConfig}
              setLogConfig={setLogConfig}
              onSave={handleSaveLogConfig}
              isSaving={updateLogConfigMutation.isPending}
            />
          )}
        </>
      )}
    </PageContainer>
  );
};

export default SystemParamsPage;
