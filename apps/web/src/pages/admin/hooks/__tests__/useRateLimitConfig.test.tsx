import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimitConfig, DEFAULT_CONFIG, DEFAULT_ANTI_REPLAY } from '../useRateLimitConfig';

const shared = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: false,
    isPending: false,
    status: 'idle',
  })),
  useMutation: vi.fn(() => ({
    mutate: shared.mutate,
    mutateAsync: vi.fn(),
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    status: 'idle',
    variables: undefined,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: shared.invalidateQueries,
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
    resetQueries: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector ? selector({ addNotification: vi.fn() }) : { addNotification: vi.fn() }
  ),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/errors', () => ({
  extractErrorMessage: vi.fn((err: unknown, defaultMsg: string) => defaultMsg),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    core: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
  },
}));

vi.mock('@/theme/tokens', () => ({
  designTokens: {
    colors: {
      primary: { dark: '#primary-dark' },
      info: { dark: '#info-dark' },
      success: { dark: '#success-dark' },
      warning: { dark: '#warning-dark' },
    },
  },
}));

vi.mock('lucide-react', () => ({
  Shield: () => null,
  Globe: () => null,
  Users: () => null,
  Server: () => null,
}));

describe('useRateLimitConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.mutate.mockClear();
    shared.invalidateQueries.mockClear();
  });

  it('should render and return default config', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    expect(result.current).toBeDefined();
    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(result.current.antiReplay).toEqual(DEFAULT_ANTI_REPLAY);
  });

  it('should return correct default input state', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    expect(result.current.newPath).toBe('');
    expect(result.current.newPathRequests).toBe(200);
    expect(result.current.newPathWindow).toBe(60);
    expect(result.current.newSkipPath).toBe('');
    expect(result.current.newEnforcePath).toBe('');
  });

  it('updateRule should update rule field for specified dimension', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.updateRule('tenant_default', 'requests', 9999);
    });
    expect(result.current.config.tenant_default.requests).toBe(9999);
    expect(result.current.config.tenant_default.window_secs).toBe(
      DEFAULT_CONFIG.tenant_default.window_secs
    );
  });

  it('updateToggle should toggle boolean dimension', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    const before = result.current.config.by_tenant;
    act(() => {
      result.current.updateToggle('by_tenant');
    });
    expect(result.current.config.by_tenant).toBe(!before);
  });

  it('handleAddPath should add path rule and reset input', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.setNewPath('/api/test');
      result.current.setNewPathRequests(100);
      result.current.setNewPathWindow(30);
    });
    act(() => {
      result.current.handleAddPath();
    });
    expect(result.current.config.path_rules).toHaveLength(1);
    expect(result.current.config.path_rules[0].path).toBe('/api/test');
    expect(result.current.config.path_rules[0].rule.requests).toBe(100);
    expect(result.current.config.path_rules[0].rule.window_secs).toBe(30);
    expect(result.current.newPath).toBe('');
    expect(result.current.newPathRequests).toBe(200);
    expect(result.current.newPathWindow).toBe(60);
  });

  it('handleAddPath should not add when newPath is empty', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.handleAddPath();
    });
    expect(result.current.config.path_rules).toHaveLength(0);
  });

  it('handleRemovePath should remove specified path rule', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.setNewPath('/api/a');
    });
    act(() => {
      result.current.handleAddPath();
    });
    act(() => {
      result.current.setNewPath('/api/b');
    });
    act(() => {
      result.current.handleAddPath();
    });
    expect(result.current.config.path_rules).toHaveLength(2);
    act(() => {
      result.current.handleRemovePath('/api/a');
    });
    expect(result.current.config.path_rules).toHaveLength(1);
    expect(result.current.config.path_rules[0].path).toBe('/api/b');
  });

  it('handleAddSkipPath should add skip path and deduplicate', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.setNewSkipPath('/custom-skip');
    });
    act(() => {
      result.current.handleAddSkipPath();
    });
    expect(result.current.config.skip_paths).toContain('/custom-skip');
    expect(result.current.newSkipPath).toBe('');
    act(() => {
      result.current.setNewSkipPath('/custom-skip');
    });
    act(() => {
      result.current.handleAddSkipPath();
    });
    expect(result.current.config.skip_paths.filter((p) => p === '/custom-skip')).toHaveLength(1);
  });

  it('handleRemoveSkipPath should remove specified skip path', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    const initialLen = result.current.config.skip_paths.length;
    act(() => {
      result.current.handleRemoveSkipPath('/health');
    });
    expect(result.current.config.skip_paths).toHaveLength(initialLen - 1);
    expect(result.current.config.skip_paths).not.toContain('/health');
  });

  it('handleAddEnforcePath should add anti-replay path', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.setNewEnforcePath('/api/enforce');
    });
    act(() => {
      result.current.handleAddEnforcePath();
    });
    expect(result.current.antiReplay.enforce_paths).toContain('/api/enforce');
    expect(result.current.newEnforcePath).toBe('');
  });

  it('handleRemoveEnforcePath should remove specified anti-replay path', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.setNewEnforcePath('/api/e1');
    });
    act(() => {
      result.current.handleAddEnforcePath();
    });
    act(() => {
      result.current.setNewEnforcePath('/api/e2');
    });
    act(() => {
      result.current.handleAddEnforcePath();
    });
    act(() => {
      result.current.handleRemoveEnforcePath('/api/e1');
    });
    expect(result.current.antiReplay.enforce_paths).toEqual(['/api/e2']);
  });

  it('should return dimensions config array', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    expect(Array.isArray(result.current.dimensions)).toBe(true);
    expect(result.current.dimensions).toHaveLength(4);
    expect(result.current.dimensions.map((d) => d.key)).toEqual([
      'tenant_default',
      'user_default',
      'ip_default',
      'global_default',
    ]);
  });

  it('should return query and mutation objects', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    expect(result.current.configQuery).toBeDefined();
    expect(result.current.antiReplayQuery).toBeDefined();
    expect(result.current.saveMutation).toBeDefined();
    expect(result.current.saveAntiReplayMutation).toBeDefined();
    expect(result.current.resetMutation).toBeDefined();
    expect(typeof result.current.saveMutation.mutate).toBe('function');
  });

  it('handleSave should call saveMutation.mutate with current config', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.handleSave();
    });
    expect(shared.mutate).toHaveBeenCalledWith(result.current.config);
  });

  it('handleReset should call resetMutation.mutate after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.handleReset();
    });
    expect(shared.mutate).toHaveBeenCalled();
  });

  it('handleReset should not call mutate when confirm cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.handleReset();
    });
    expect(shared.mutate).not.toHaveBeenCalled();
  });

  it('handleSaveAntiReplay should call saveAntiReplayMutation.mutate', () => {
    const { result } = renderHook(() => useRateLimitConfig());
    act(() => {
      result.current.handleSaveAntiReplay();
    });
    expect(shared.mutate).toHaveBeenCalledWith(result.current.antiReplay);
  });
});
