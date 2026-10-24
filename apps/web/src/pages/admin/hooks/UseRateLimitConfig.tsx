import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ApiResponse } from '@/api/client';
import type { useMutation, useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Shield, Globe, Users, Server } from 'lucide-react';
import { apiClient } from '@/api/client';
import { extractErrorMessage } from '@/utils/errors';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';

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

interface UseRateLimitConfigReturn {
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
  resetMutation: ReturnType<typeof useMutation<ApiResponse<RateLimitConfig>, Error, void, unknown>>;
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
