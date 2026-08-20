import { create } from 'zustand';
import type { FeatureFlag } from '@/api/system';
import { featureFlagApi } from '@/api/system';

interface FeatureFlagState {
  flags: FeatureFlag[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number;

  fetchFlags: (force?: boolean) => Promise<void>;
  updateFlag: (key: string, enabled: boolean) => Promise<boolean>;
  refreshFlag: (key: string) => Promise<boolean>;
  isEnabled: (key: string) => boolean;
  getFlag: (key: string) => FeatureFlag | undefined;
  getEnabledFlags: () => FeatureFlag[];
  clearError: () => void;
}

const CACHE_TTL = 60000;

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  flags: [],
  loading: false,
  error: null,
  lastFetchTime: 0,

  fetchFlags: async (force = false) => {
    const now = Date.now();
    const lastFetch = get().lastFetchTime;
    if (!force && lastFetch && now - lastFetch < CACHE_TTL) {
      return;
    }

    try {
      set({ loading: true, error: null });
      const response = await featureFlagApi.list();
      if (response.success && response.data) {
        set({ flags: response.data, lastFetchTime: now });
      }
    } catch (error: unknown) {
      set({
        error: (error as { message?: string }).message || 'Failed to fetch feature flags',
      });
    } finally {
      set({ loading: false });
    }
  },

  updateFlag: async (key: string, enabled: boolean) => {
    try {
      set({ loading: true, error: null });
      const response = await featureFlagApi.update(key, { enabled });
      if (response.success && response.data) {
        set((state) => ({
          flags: state.flags.map((f) => (f.key === key ? response.data! : f)),
        }));
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({
        error: (error as { message?: string }).message || 'Failed to update feature flag',
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  refreshFlag: async (key: string) => {
    try {
      const response = await featureFlagApi.refresh(key);
      return response.success;
    } catch {
      return false;
    }
  },

  isEnabled: (key: string) => {
    const flag = get().flags.find((f) => f.key === key);
    if (!flag) return false;
    return flag.state === 'Enabled';
  },

  getFlag: (key: string) => {
    return get().flags.find((f) => f.key === key);
  },

  getEnabledFlags: () => {
    return get().flags.filter((f) => f.state === 'Enabled');
  },

  clearError: () => {
    set({ error: null });
  },
}));

const useFeatureFlags = () => useFeatureFlagStore((state) => state.flags);
const useFeatureFlagLoading = () => useFeatureFlagStore((state) => state.loading);
const useFeatureFlagError = () => useFeatureFlagStore((state) => state.error);

function useFeatureFlag(key: string): boolean {
  return useFeatureFlagStore((state) => {
    const flag = state.flags.find((f) => f.key === key);
    return flag ? flag.state === 'Enabled' : false;
  });
}
