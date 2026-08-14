import type { ModuleRegistration } from './module-registry';
import { moduleRegistry } from './module-registry';
import i18n from '@/i18n';

export interface RegistryFetchResult {
  success: boolean;
  modules: ModuleRegistration[];
  timestamp: number;
  error?: string;
}

export interface ModuleHealthStatus {
  moduleId: string;
  healthy: boolean;
  responseTime?: number;
  lastChecked: number;
  error?: string;
}

const SERVER_REGISTRY_URL = '/api/mf/registry';
const FETCH_TIMEOUT = 10000;

type RegistryChangeCallback = (modules: ModuleRegistration[]) => void;

class RegistryApi {
  private listeners: Set<RegistryChangeCallback> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastFetchTimestamp = 0;

  async fetchRegistry(): Promise<RegistryFetchResult> {
    try {
      const response = await fetch(SERVER_REGISTRY_URL, {
        method: 'GET',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as ModuleRegistration[];
      this.lastFetchTimestamp = Date.now();

      if (Array.isArray(data)) {
        data.forEach((m) => {
          const existing = moduleRegistry.getModule(m.id);
          if (!existing) {
            try {
              moduleRegistry.registerModule(m);
            } catch {
              // ignore validation errors
            }
          }
        });
      }

      this.notifyListeners();

      return {
        success: true,
        modules: moduleRegistry.listModules(),
        timestamp: this.lastFetchTimestamp,
      };
    } catch (err) {
      return {
        success: false,
        modules: moduleRegistry.listModules(),
        timestamp: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async pushRegistry(): Promise<{ success: boolean; error?: string }> {
    try {
      const modules = moduleRegistry.listModules();
      const response = await fetch(SERVER_REGISTRY_URL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modules),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  subscribeRegistryChanges(callback: RegistryChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const modules = moduleRegistry.listModules();
    this.listeners.forEach((cb) => {
      try {
        cb(modules);
      } catch {
        // ignore
      }
    });
  }

  async validateRemoteModule(entryUrl: string): Promise<{
    valid: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(entryUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;

      if (!response.ok) {
        return {
          valid: false,
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }

      return {
        valid: true,
        responseTime,
      };
    } catch (err) {
      const responseTime = performance.now() - startTime;
      return {
        valid: false,
        responseTime,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async pingModule(moduleId: string): Promise<ModuleHealthStatus> {
    const module = moduleRegistry.getModule(moduleId);

    if (!module) {
      return {
        moduleId,
        healthy: false,
        lastChecked: Date.now(),
        error: i18n.t('microfrontend.registry-api.k0'),
      };
    }

    const result = await this.validateRemoteModule(module.entryUrl);

    return {
      moduleId,
      healthy: result.valid,
      responseTime: result.responseTime,
      lastChecked: Date.now(),
      error: result.error,
    };
  }

  async pingAllModules(): Promise<ModuleHealthStatus[]> {
    const modules = moduleRegistry.listModules({ status: 'active' });
    const results = await Promise.all(modules.map((m) => this.pingModule(m.id)));
    return results;
  }

  startPolling(intervalMs: number = 30000): void {
    if (this.pollTimer) {
      this.stopPolling();
    }

    this.pollTimer = setInterval(() => {
      this.fetchRegistry().catch(() => {
        // ignore
      });
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

export const registryApi = new RegistryApi();
export default registryApi;
