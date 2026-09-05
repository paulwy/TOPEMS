import i18n from '@/i18n';

enum ProtectionType {
  PROTOTYPEPOLLUTION = 'prototype_pollution',
  GLOBALTAMPERING = 'global_tampering',
  DANGEROUSAPI = 'dangerous_api',
  MEMORYLEAK = 'memory_leak',
  ANOMALY = 'anomaly',
}

enum ProtectionSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface ProtectionConfig {
  enablePrototypePollutionGuard: boolean;
  enableGlobalIsolation: boolean;
  enableDangerousApiInterception: boolean;
  enableMemoryLeakDetection: boolean;
  enableAnomalyDetection: boolean;
}

export interface ProtectionEvent {
  type: ProtectionType;
  severity: ProtectionSeverity;
  target: string;
  details: string;
  timestamp: number;
}

export interface SandboxContext {
  globals: Record<string, unknown>;
  allowedApis: string[];
  blockedApis: string[];
  console: Console | null;
}

interface ProtectionStats {
  totalEvents: number;
  blockedCount: number;
  typeCounts: Record<ProtectionType, number>;
  severityCounts: Record<ProtectionSeverity, number>;
}

const DEFAULT_CONFIG: ProtectionConfig = {
  enablePrototypePollutionGuard: true,
  enableGlobalIsolation: false,
  enableDangerousApiInterception: true,
  enableMemoryLeakDetection: false,
  enableAnomalyDetection: false,
};

class RuntimeProtector {
  private config: ProtectionConfig;
  private events: ProtectionEvent[] = [];
  private enabled = false;
  private originalApis: Map<string, unknown> = new Map();
  private maxEvents = 500;
  private stats: ProtectionStats = {
    totalEvents: 0,
    blockedCount: 0,
    typeCounts: {
      [ProtectionType.PROTOTYPEPOLLUTION]: 0,
      [ProtectionType.GLOBALTAMPERING]: 0,
      [ProtectionType.DANGEROUSAPI]: 0,
      [ProtectionType.MEMORYLEAK]: 0,
      [ProtectionType.ANOMALY]: 0,
    },
    severityCounts: {
      [ProtectionSeverity.CRITICAL]: 0,
      [ProtectionSeverity.HIGH]: 0,
      [ProtectionSeverity.MEDIUM]: 0,
      [ProtectionSeverity.LOW]: 0,
    },
  };
  private globalSnapshot: Record<string, unknown> = {};
  private leakDetectionInterval: number | null = null;

  constructor(config?: Partial<ProtectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  enableProtection(): void {
    if (this.enabled) return;
    this.enabled = true;

    if (this.config.enablePrototypePollutionGuard) {
      this.setupPrototypePollutionGuard();
    }
    if (this.config.enableGlobalIsolation) {
      this.setupGlobalIsolation();
    }
    if (this.config.enableDangerousApiInterception) {
      this.setupDangerousApiInterception();
    }
    if (this.config.enableMemoryLeakDetection) {
      this.startMemoryLeakDetection();
    }
  }

  disableProtection(): void {
    if (!this.enabled) return;
    this.enabled = false;

    this.restoreDangerousApis();
    this.stopMemoryLeakDetection();
  }

  configure(config: Partial<ProtectionConfig>): void {
    const wasEnabled = this.enabled;
    if (wasEnabled) {
      this.disableProtection();
    }

    this.config = { ...this.config, ...config };

    if (wasEnabled) {
      this.enableProtection();
    }
  }

  getEvents(filters?: { type?: ProtectionType; severity?: ProtectionSeverity }): ProtectionEvent[] {
    let filtered = [...this.events];

    if (filters?.type) {
      filtered = filtered.filter((e) => e.type === filters.type);
    }
    if (filters?.severity) {
      filtered = filtered.filter((e) => e.severity === filters.severity);
    }

    return filtered;
  }

  private addEvent(event: Omit<ProtectionEvent, 'timestamp'>): void {
    const fullEvent: ProtectionEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    this.stats.totalEvents++;
    this.stats.typeCounts[event.type]++;
    this.stats.severityCounts[event.severity]++;
  }

  private setupPrototypePollutionGuard(): void {
    if (typeof Object === 'undefined') return;

    const proto = Object.prototype;
    const protectedProps = ['__proto__', 'prototype', 'constructor'];

    protectedProps.forEach((prop) => {
      try {
        Object.defineProperty(proto, prop, {
          set: (value) => {
            this.addEvent({
              type: ProtectionType.PROTOTYPEPOLLUTION,
              severity: ProtectionSeverity.CRITICAL,
              target: `Object.prototype.${prop}`,
              details: `${i18n.t('microfrontend.runtime-protection.k0')}${prop}${i18n.t('microfrontend.runtime-protection.k1')}${typeof value}`,
            });
            this.stats.blockedCount++;
            throw new Error(`${i18n.t('microfrontend.runtime-protection.k2')}${prop}`);
          },
          get: () => {
            if (prop === '__proto__') {
              return Object.getPrototypeOf(this);
            }
            return;
          },
          configurable: false,
        });
      } catch {
        // 某些环境可能无法重新定义这些属性
      }
    });
  }

  private setupGlobalIsolation(): void {
    if (typeof window === 'undefined') return;

    this.globalSnapshot = { ...window };

    const handler: ProxyHandler<Window> = {
      get: (target, prop) => {
        return Reflect.get(target, prop);
      },
      set: (target, prop, value) => {
        const propStr = String(prop);
        if (!(prop in this.globalSnapshot)) {
          this.addEvent({
            type: ProtectionType.GLOBALTAMPERING,
            severity: ProtectionSeverity.MEDIUM,
            target: `window.${propStr}`,
            details: `${i18n.t('microfrontend.runtime-protection.k3')}${propStr}`,
          });
        } else if (this.globalSnapshot[propStr] !== value) {
          this.addEvent({
            type: ProtectionType.GLOBALTAMPERING,
            severity: ProtectionSeverity.HIGH,
            target: `window.${propStr}`,
            details: `${i18n.t('microfrontend.runtime-protection.k4')}${propStr}`,
          });
        }
        return Reflect.set(target, prop, value);
      },
      deleteProperty: (target, prop) => {
        const propStr = String(prop);
        this.addEvent({
          type: ProtectionType.GLOBALTAMPERING,
          severity: ProtectionSeverity.HIGH,
          target: `window.${propStr}`,
          details: `${i18n.t('microfrontend.runtime-protection.k5')}${propStr}`,
        });
        return Reflect.deleteProperty(target, prop);
      },
    };

    try {
      new Proxy(window, handler);
    } catch {
      // window 可能无法被代理
    }
  }

  private setupDangerousApiInterception(): void {
    if (typeof window === 'undefined') return;

    const dangerousApis: Array<{
      name: string;
      severity: ProtectionSeverity;
      target: string;
    }> = [
      { name: 'eval', severity: ProtectionSeverity.CRITICAL, target: 'eval' },
      { name: 'Function', severity: ProtectionSeverity.CRITICAL, target: 'Function' },
      { name: 'setTimeout', severity: ProtectionSeverity.LOW, target: 'setTimeout' },
      { name: 'setInterval', severity: ProtectionSeverity.LOW, target: 'setInterval' },
    ];

    dangerousApis.forEach(({ name, severity, target }) => {
      const original = (window as Record<string, unknown>)[name];
      if (typeof original === 'function') {
        this.originalApis.set(name, original);

        const protector = this;
        const intercepted = function (this: unknown, ...args: unknown[]) {
          protector.addEvent({
            type: ProtectionType.DANGEROUSAPI,
            severity,
            target,
            details: `${i18n.t('microfrontend.runtime-protection.api_6')}${name}`,
          });

          if (name === 'eval' || name === 'Function') {
            protector.stats.blockedCount++;
            throw new Error(
              `${i18n.t('microfrontend.runtime-protection.k7')}${name}${i18n.t('microfrontend.runtime-protection.k8')}`
            );
          }

          return (original as Function).apply(this, args);
        };

        Object.defineProperty(window, name, {
          value: intercepted,
          writable: false,
          configurable: false,
        });
      }
    });

    if (typeof Element !== 'undefined' && Element.prototype) {
      const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'innerHTML'
      );
      if (originalInnerHTMLDescriptor && originalInnerHTMLDescriptor.set) {
        const originalSet = originalInnerHTMLDescriptor.set;
        const protector = this;

        Object.defineProperty(Element.prototype, 'innerHTML', {
          set(this: Element, value: string) {
            protector.addEvent({
              type: ProtectionType.DANGEROUSAPI,
              severity: ProtectionSeverity.HIGH,
              target: 'Element.innerHTML',
              details: i18n.t('microfrontend.runtime-protection.k0'),
            });
            return originalSet.call(this, value);
          },
          get: originalInnerHTMLDescriptor.get,
          configurable: true,
        });
      }
    }
  }

  private restoreDangerousApis(): void {
    this.originalApis.forEach((original, name) => {
      if (typeof window !== 'undefined') {
        try {
          Object.defineProperty(window, name, {
            value: original,
            writable: true,
            configurable: true,
          });
        } catch {
          // 忽略恢复失败
        }
      }
    });
    this.originalApis.clear();
  }

  private startMemoryLeakDetection(): void {
    if (typeof performance === 'undefined') return;

    this.leakDetectionInterval = window.setInterval(() => {
      this.detectLeaks();
    }, 30000);
  }

  private stopMemoryLeakDetection(): void {
    if (this.leakDetectionInterval !== null) {
      clearInterval(this.leakDetectionInterval);
      this.leakDetectionInterval = null;
    }
  }

  createSandbox(context?: Partial<SandboxContext>): SandboxContext {
    const sandbox: SandboxContext = {
      globals: {},
      allowedApis: ['console.log', 'console.warn', 'console.error'],
      blockedApis: ['eval', 'Function', 'fetch', 'XMLHttpRequest'],
      console: null,
      ...context,
    };

    return sandbox;
  }

  runInSandbox(code: string, context?: Partial<SandboxContext>): unknown {
    const sandbox = this.createSandbox(context);

    try {
      const sandboxConsole = {
        log: (...args: unknown[]) => {
          if (sandbox.allowedApis.includes('console.log')) {
            console.info('[Sandbox]', ...args);
          }
        },
        warn: (...args: unknown[]) => {
          if (sandbox.allowedApis.includes('console.warn')) {
            console.warn('[Sandbox]', ...args);
          }
        },
        error: (...args: unknown[]) => {
          if (sandbox.allowedApis.includes('console.error')) {
            console.error('[Sandbox]', ...args);
          }
        },
      };

      const sandboxGlobals = {
        ...sandbox.globals,
        console: sandboxConsole,
      };

      const fn = new Function(
        ...Object.keys(sandboxGlobals),
        `
        "use strict";
        return eval(arguments[0]);
      `
      );

      this.addEvent({
        type: ProtectionType.ANOMALY,
        severity: ProtectionSeverity.MEDIUM,
        target: 'Sandbox.execution',
        details: i18n.t('microfrontend.runtime-protection.k1'),
      });

      return fn(...Object.values(sandboxGlobals), code);
    } catch (error) {
      this.addEvent({
        type: ProtectionType.DANGEROUSAPI,
        severity: ProtectionSeverity.HIGH,
        target: 'Sandbox.execution',
        details: `${i18n.t('microfrontend.runtime-protection.k9')}${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }
  }

  detectLeaks(): {
    detected: boolean;
    details: string[];
  } {
    const details: string[] = [];
    let detected = false;

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (
        performance as Performance & {
          memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        }
      ).memory;

      if (mem) {
        const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          detected = true;
          details.push(
            `${i18n.t('microfrontend.runtime-protection.k10')}${usagePercent.toFixed(1)}%`
          );

          this.addEvent({
            type: ProtectionType.MEMORYLEAK,
            severity: usagePercent > 90 ? ProtectionSeverity.CRITICAL : ProtectionSeverity.HIGH,
            target: 'memory.heap',
            details: `${i18n.t('microfrontend.runtime-protection.k11')}${usagePercent.toFixed(1)}${i18n.t('microfrontend.runtime-protection.k12')}`,
          });
        }
      }
    }

    if (
      typeof window !== 'undefined' &&
      window.eventListeners &&
      window.eventListeners.length > 1000
    ) {
      detected = true;
      details.push(
        `${i18n.t('microfrontend.runtime-protection.k13')}${window.eventListeners.length}`
      );
    }

    return { detected, details };
  }

  getStats(): ProtectionStats {
    return {
      ...this.stats,
      typeCounts: { ...this.stats.typeCounts },
      severityCounts: { ...this.stats.severityCounts },
    };
  }

  clearEvents(): void {
    this.events = [];
    this.stats = {
      totalEvents: 0,
      blockedCount: 0,
      typeCounts: {
        [ProtectionType.PROTOTYPEPOLLUTION]: 0,
        [ProtectionType.GLOBALTAMPERING]: 0,
        [ProtectionType.DANGEROUSAPI]: 0,
        [ProtectionType.MEMORYLEAK]: 0,
        [ProtectionType.ANOMALY]: 0,
      },
      severityCounts: {
        [ProtectionSeverity.CRITICAL]: 0,
        [ProtectionSeverity.HIGH]: 0,
        [ProtectionSeverity.MEDIUM]: 0,
        [ProtectionSeverity.LOW]: 0,
      },
    };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getConfig(): ProtectionConfig {
    return { ...this.config };
  }
}

const runtimeProtector = new RuntimeProtector();
export default runtimeProtector;
