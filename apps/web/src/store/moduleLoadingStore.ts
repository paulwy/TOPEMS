import { create } from 'zustand';
import { LOADER_TIMEOUT } from '@topems/tokens';

export type ModuleStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ModuleLoadingState {
  status: ModuleStatus;
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: Error;
  dependencies: string[];
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
}

interface ModuleLoadingStore {
  modules: Record<string, ModuleLoadingState>;
  totalProgress: number;

  setLoading: (moduleId: string, dependencies?: string[]) => void;
  setProgress: (moduleId: string, progress: number) => void;
  setLoaded: (moduleId: string) => void;
  setError: (moduleId: string, error: Error) => void;
  setHealthStatus: (moduleId: string, status: 'healthy' | 'unhealthy' | 'unknown') => void;
  reset: (moduleId?: string) => void;

  getModuleState: (moduleId: string) => ModuleLoadingState | undefined;
  getProgress: () => number;
  getModuleLoadTime: (moduleId: string) => number | undefined;
  isModuleLoaded: (moduleId: string) => boolean;
  isModuleLoading: (moduleId: string) => boolean;
  hasModuleError: (moduleId: string) => boolean;

  preload: (moduleId: string, loader: () => Promise<unknown>) => Promise<boolean>;
  unload: (moduleId: string) => void;
}

const DEFAULT_TIMEOUT = LOADER_TIMEOUT.MODULE;

export const useModuleLoadingStore = create<ModuleLoadingStore>((set, get) => ({
  modules: {},
  totalProgress: 0,

  setLoading: (moduleId, dependencies = []) =>
    set((state) => ({
      modules: {
        ...state.modules,
        [moduleId]: {
          status: 'loading',
          progress: 0,
          startTime: Date.now(),
          dependencies,
        },
      },
    })),

  setProgress: (moduleId, progress) =>
    set((state) => {
      const module = state.modules[moduleId];
      if (!module) return state;

      const updatedModule = { ...module, progress: Math.min(100, Math.max(0, progress)) };
      const modules = { ...state.modules, [moduleId]: updatedModule };

      const loadingModules = Object.values(modules).filter((m) => m.status === 'loading');
      const totalProgress =
        loadingModules.length > 0
          ? loadingModules.reduce((sum, m) => sum + m.progress, 0) / loadingModules.length
          : 0;

      return { modules, totalProgress };
    }),

  setLoaded: (moduleId) =>
    set((state) => {
      const module = state.modules[moduleId];
      if (!module) return state;

      const updatedModule: ModuleLoadingState = {
        ...module,
        status: 'loaded',
        progress: 100,
        endTime: Date.now(),
        healthStatus: 'healthy',
      };

      const modules = { ...state.modules, [moduleId]: updatedModule };

      const loadingModules = Object.values(modules).filter((m) => m.status === 'loading');
      const totalProgress =
        loadingModules.length > 0
          ? loadingModules.reduce((sum, m) => sum + m.progress, 0) / loadingModules.length
          : Object.values(modules).filter((m) => m.status === 'loaded').length ===
              Object.keys(modules).length
            ? 100
            : 0;

      return { modules, totalProgress };
    }),

  setError: (moduleId, error) =>
    set((state) => {
      const module = state.modules[moduleId];
      if (!module) return state;

      const updatedModule: ModuleLoadingState = {
        ...module,
        status: 'error',
        endTime: Date.now(),
        error,
        healthStatus: 'unhealthy',
      };

      return {
        modules: { ...state.modules, [moduleId]: updatedModule },
      };
    }),

  setHealthStatus: (moduleId, status) =>
    set((state) => {
      const module = state.modules[moduleId];
      if (!module) return state;

      return {
        modules: {
          ...state.modules,
          [moduleId]: { ...module, healthStatus: status },
        },
      };
    }),

  reset: (moduleId) =>
    set((state) => {
      if (moduleId) {
        const { [moduleId]: _, ...remainingModules } = state.modules;
        return { modules: remainingModules };
      }
      return { modules: {}, totalProgress: 0 };
    }),

  getModuleState: (moduleId) => get().modules[moduleId],

  getProgress: () => get().totalProgress,

  getModuleLoadTime: (moduleId) => {
    const module = get().modules[moduleId];
    if (!module?.startTime) return;
    const endTime = module.endTime || Date.now();
    return endTime - module.startTime;
  },

  isModuleLoaded: (moduleId) => get().modules[moduleId]?.status === 'loaded',

  isModuleLoading: (moduleId) => get().modules[moduleId]?.status === 'loading',

  hasModuleError: (moduleId) => get().modules[moduleId]?.status === 'error',

  preload: async (moduleId, loader) => {
    const { setLoading, setLoaded, setError, setProgress } = get();

    if (get().isModuleLoaded(moduleId)) {
      return true;
    }

    setLoading(moduleId);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Module loading timeout')), DEFAULT_TIMEOUT);
    });

    const loadPromise = (async () => {
      let lastProgress = 0;
      const progressInterval = setInterval(() => {
        if (lastProgress < 90) {
          lastProgress += Math.random() * 10;
          setProgress(moduleId, Math.min(90, lastProgress));
        }
      }, 200);

      try {
        await loader();
        clearInterval(progressInterval);
        setProgress(moduleId, 100);
        setLoaded(moduleId);
        return true;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    })();

    try {
      await Promise.race([loadPromise, timeoutPromise]);
      return true;
    } catch (error) {
      setError(moduleId, error as Error);
      return false;
    }
  },

  unload: (moduleId) => {
    const { reset } = get();
    reset(moduleId);
  },
}));
