import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Shield, Globe, Users, Server } from 'lucide-react';
import { apiClient } from '@/api/client';
import { extractErrorMessage } from '@/utils/errors';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

export interface RateLimitRule {
  requests: number;
  window_secs: number;
  priority: number;
}

export interface PathRule {
  path: string;
  rule: RateLimitRule;
}

export interface RateLimitConfig {
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

export interface AntiReplayConfig {
  enabled: boolean;
  tolerance_secs: number;
  nonce_cache_secs: number;
  timestamp_header: string;
  nonce_header: string;
  enforce_paths: string[];
}

export const DEFAULT_CONFIG: RateLimitConfig = {
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

export const DEFAULT_ANTI_REPLAY: AntiReplayConfig = {
  enabled: false,
  tolerance_secs: 300,
  nonce_cache_secs: 600,
  timestamp_header: 'X-Request-Timestamp',
  nonce_header: 'X-Request-Nonce',
  enforce_paths: [],
};

export interface UseRateLimitConfigReturn {
  config: RateLimitConfig;
  setConfig: React.Dispatch<React.SetStateAction<RateLimitConfig>>;
  antiReplay: AntiReplayConfig;
  setAntiReplay: React.Dispatch<React.SetStateAction<AntiReplayConfig>>;
  newPath: string;
  setNewPath: React.Dispatch<React.SetStateAction<string>>;
  newPathRequests: number;
  setNewPathRequests: React.Dispatch<React.SetStateAction<number>>;
  newPathWindow: number;
  setNewPathWindow: React.Dispatch<React.SetStateAction<number>>;
  newSkipPath: string;
  setNewSkipPath: React.Dispatch<React.SetStateAction<string>>;
  newEnforcePath: string;
  setNewEnforcePath: React.Dispatch<React.SetStateAction<string>>;
  configQuery: ReturnType<typeof useQuery<RateLimitConfig>>;
  antiReplayQuery: ReturnType<typeof useQuery<AntiReplayConfig>>;
  saveMutation: ReturnType<typeof useMutation<unknown, unknown, RateLimitConfig>>;
  saveAntiReplayMutation: ReturnType<typeof useMutation<unknown, unknown, AntiReplayConfig>>;
  resetMutation: ReturnType<typeof useMutation<any, any, any, any>>;
  updateRule: (
    key: keyof Pick<
      RateLimitConfig,
      'tenant_default' | 'user_default' | 'ip_default' | 'global_default'
    >,
    field: keyof RateLimitRule,
    value: number
  ) => void;
  updateToggle: (key: keyof RateLimitConfig) => void;
  handleAddPath: () => void;
  handleRemovePath: (path: string) => void;
  handleAddSkipPath: () => void;
  handleRemoveSkipPath: (path: string) => void;
  handleAddEnforcePath: () => void;
  handleRemoveEnforcePath: (path: string) => void;
  handleSave: () => void;
  handleReset: () => void;
  handleSaveAntiReplay: () => void;
  dimensions: Array<{
    key: 'tenant_default' | 'user_default' | 'ip_default' | 'global_default';
    title: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  }>;
}

export function useRateLimitConfig(): UseRateLimitConfigReturn {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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
          title: t('admin.rate_limit_config.saved_successfully'),
          message: t('admin.rate_limit_config.rate_limit_configuration_updated'),
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: ['admin-rate-limit-config'] });
      } else {
        addNotification({
          title: t('admin.rate_limit_config.save_failed'),
          message:
            res.message || t('admin.rate_limit_config.failed_to_save_rate_limit_configuration'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(t('admin.rate_limit_config_page.log_60266e'), err);
      addNotification({
        title: t('admin.rate_limit_config.save_failed'),
        message: extractErrorMessage(
          err,
          t('admin.rate_limit_config.failed_to_save_rate_limit_configuration_2')
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
          title: t('admin.rate_limit_config.saved_successfully'),
          message: t('admin.rate_limit_config.anti_replay_configuration_updated'),
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: ['admin-anti-replay-config'] });
      } else {
        addNotification({
          title: t('admin.rate_limit_config.save_failed'),
          message:
            res.message || t('admin.rate_limit_config.failed_to_save_anti_replay_configuration'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error(t('admin.rate_limit_config_page.log_e66407'), err);
      addNotification({
        title: t('admin.rate_limit_config.save_failed'),
        message: extractErrorMessage(
          err,
          t('admin.rate_limit_config.failed_to_save_anti_replay_configuration_2')
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
          title: t('admin.rate_limit_config.reset'),
          message: t('admin.rate_limit_config.rate_limit_configuration_reset_to_default'),
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
    if (
      window.confirm(
        t('admin.rate_limit_config.are_you_sure_you_want_to_reset_to_default_configuration')
      )
    ) {
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
        title: t('admin.rate_limit_config.tenant_dimension'),
        icon: <Server size={18} />,
        color: ct.primary.dark,
        description: t('admin.rate_limit_config_page.description_703270'),
      },
      {
        key: 'user_default' as const,
        title: t('admin.rate_limit_config.user_dimension'),
        icon: <Users size={18} />,
        color: ct.info.dark,
        description: t('admin.rate_limit_config_page.description_a9db10'),
      },
      {
        key: 'ip_default' as const,
        title: t('admin.rate_limit_config_page.title_30ea81'),
        icon: <Globe size={18} />,
        color: ct.success.dark,
        description: t('admin.rate_limit_config_page.description_bed0c4'),
      },
      {
        key: 'global_default' as const,
        title: t('admin.rate_limit_config.global_dimension'),
        icon: <Shield size={18} />,
        color: ct.warning.dark,
        description: t('admin.rate_limit_config_page.description_242ed1'),
      },
    ],
    []
  );

  return {
    config,
    setConfig,
    antiReplay,
    setAntiReplay,
    newPath,
    setNewPath,
    newPathRequests,
    setNewPathRequests,
    newPathWindow,
    setNewPathWindow,
    newSkipPath,
    setNewSkipPath,
    newEnforcePath,
    setNewEnforcePath,
    configQuery,
    antiReplayQuery,
    saveMutation,
    saveAntiReplayMutation,
    resetMutation,
    updateRule,
    updateToggle,
    handleAddPath,
    handleRemovePath,
    handleAddSkipPath,
    handleRemoveSkipPath,
    handleAddEnforcePath,
    handleRemoveEnforcePath,
    handleSave,
    handleReset,
    handleSaveAntiReplay,
    dimensions,
  };
}
