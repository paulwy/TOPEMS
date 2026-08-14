/**
 * V42.0 Track F: 微前端企业级 — 沙箱管理器
 *
 * 单例 SandboxManager 统一管理三种隔离（JS + 样式 + 事件），
 * 为每个微前端模块创建一个 SandboxBundle，并提供：
 * - createSandbox(moduleId, options): 创建完整沙箱
 * - destroySandbox(moduleId): 销毁沙箱（清理所有资源）
 * - getSandbox(moduleId): 获取沙箱实例
 * - listSandboxs(): 列出所有沙箱
 * - healthCheck(moduleId): 沙箱健康检查
 * - getConflictReport(): 全局冲突报告
 * - getLeakReport(): 全局泄漏报告
 *
 * @example
 * const bundle = sandboxManager.createSandbox('crm', {
 *   js: { interceptWindow: true },
 *   style: { mode: 'shadow' },
 * });
 * bundle.jsSandbox.activate();
 * bundle.eventIsolation.activate();
 */

import { JavaScriptSandbox, type SandboxOptions } from './js-sandbox';
import { StyleIsolation, type StyleIsolationOptions } from './style-isolation';
import { EventIsolation, type EventLeakReport } from './event-isolation';
import { conflictDetector, type ConflictReport } from './conflict-detector';
import i18n from '@/i18n';

// ==================== 类型定义 ====================

export type SandboxStatus = 'active' | 'inactive' | 'error';

export interface SandboxBundle {
  /** 模块 ID */
  moduleId: string;
  /** JS 沙箱 */
  jsSandbox: JavaScriptSandbox;
  /** 样式隔离 */
  styleIsolation: StyleIsolation;
  /** 事件隔离 */
  eventIsolation: EventIsolation;
  /** 创建时间戳 */
  createdAt: number;
  /** 当前状态 */
  status: SandboxStatus;
  /** 错误信息（status === 'error' 时填充） */
  error?: Error;
}

export interface SandboxManagerOptions {
  /** JS 沙箱配置 */
  js?: SandboxOptions;
  /** 样式隔离配置 */
  style?: StyleIsolationOptions;
  /** 是否启用事件隔离（默认 true） */
  events?: boolean;
}

export interface HealthCheckResult {
  /** 模块 ID */
  moduleId: string;
  /** 整体健康状态 */
  healthy: boolean;
  /** JS 沙箱状态 */
  js: { active: boolean; globalVarCount: number };
  /** 样式隔离状态 */
  style: { mode: string; styleCount: number };
  /** 事件隔离状态 */
  events: { active: boolean; eventCount: number; timerCount: number };
  /** 检测到的问题列表 */
  issues: string[];
  /** 检查时间戳 */
  timestamp: number;
}

export interface GlobalLeakReport {
  /** 总模块数 */
  moduleCount: number;
  /** 有泄漏的模块数 */
  leakyModuleCount: number;
  /** 总未清理事件数 */
  totalEvents: number;
  /** 总未清理定时器数 */
  totalTimers: number;
  /** 各模块详细报告 */
  modules: Array<{ moduleId: string; report: EventLeakReport }>;
  /** 严重级别 */
  severity: 'info' | 'warning' | 'error';
}

// ==================== SandboxManager（单例） ====================

class SandboxManagerImpl {
  /** 沙箱集合: moduleId -> SandboxBundle */
  private readonly sandboxes = new Map<string, SandboxBundle>();

  /**
   * 创建完整沙箱（JS + 样式 + 事件）
   */
  createSandbox(moduleId: string, options: SandboxManagerOptions = {}): SandboxBundle {
    // 已存在则先销毁旧的
    if (this.sandboxes.has(moduleId)) {
      console.warn(`${i18n.t('microfrontend.sandbox-manager.sandboxmanager_0')}${moduleId}${i18n.t('microfrontend.sandbox-manager.k1')}`);
      this.destroySandbox(moduleId);
    }

    const jsSandbox = new JavaScriptSandbox(moduleId, options.js ?? {});
    const styleIsolation = new StyleIsolation(moduleId, options.style ?? { mode: 'scoped' });
    const eventIsolation = new EventIsolation(moduleId);

    const bundle: SandboxBundle = {
      moduleId,
      jsSandbox,
      styleIsolation,
      eventIsolation,
      createdAt: Date.now(),
      status: 'inactive',
    };

    this.sandboxes.set(moduleId, bundle);
    return bundle;
  }

  /**
   * 销毁沙箱（清理所有资源）
   */
  destroySandbox(moduleId: string): boolean {
    const bundle = this.sandboxes.get(moduleId);
    if (!bundle) return false;

    try {
      // 顺序：先停用事件 → 清理事件/定时器 → 移除样式 → 停用 JS 沙箱
      bundle.eventIsolation.deactivate();
      bundle.eventIsolation.clearAllEvents();
      bundle.eventIsolation.clearAllTimers();
      bundle.eventIsolation.uninstallPatches();

      bundle.styleIsolation.removeStyles();

      bundle.jsSandbox.deactivate();
      bundle.jsSandbox.clear();

      // 从冲突检测器中移除该模块的注册
      conflictDetector.clearModule(moduleId);

      this.sandboxes.delete(moduleId);
      return true;
    } catch (err) {
      console.error(`${i18n.t('microfrontend.sandbox-manager.k2')}${moduleId}${i18n.t('microfrontend.sandbox-manager.k3')}`, err);
      bundle.status = 'error';
      bundle.error = err instanceof Error ? err : new Error(String(err));
      return false;
    }
  }

  /** 获取沙箱实例 */
  getSandbox(moduleId: string): SandboxBundle | undefined {
    return this.sandboxes.get(moduleId);
  }

  /** 列出所有沙箱 */
  listSandboxs(): SandboxBundle[] {
    return Array.from(this.sandboxes.values());
  }

  /** 激活沙箱（激活 JS/事件隔离） */
  activateSandbox(moduleId: string): boolean {
    const bundle = this.sandboxes.get(moduleId);
    if (!bundle) return false;
    try {
      bundle.jsSandbox.activate();
      if (bundle.eventIsolation) {
        bundle.eventIsolation.activate();
      }
      bundle.status = 'active';
      return true;
    } catch (err) {
      bundle.status = 'error';
      bundle.error = err instanceof Error ? err : new Error(String(err));
      return false;
    }
  }

  /** 停用沙箱（保留实例，仅暂停拦截） */
  deactivateSandbox(moduleId: string): boolean {
    const bundle = this.sandboxes.get(moduleId);
    if (!bundle) return false;
    try {
      bundle.jsSandbox.deactivate();
      bundle.eventIsolation.deactivate();
      bundle.status = 'inactive';
      return true;
    } catch (err) {
      bundle.status = 'error';
      bundle.error = err instanceof Error ? err : new Error(String(err));
      return false;
    }
  }

  /** 沙箱健康检查 */
  healthCheck(moduleId: string): HealthCheckResult | null {
    const bundle = this.sandboxes.get(moduleId);
    if (!bundle) return null;

    const issues: string[] = [];
    const jsActive = bundle.jsSandbox.isActive();
    const jsGlobalVars = bundle.jsSandbox.getGlobalVars().size;
    const styleCount = bundle.styleIsolation.getStyleCount();
    const styleMode = bundle.styleIsolation.options.mode;
    const eventCount = bundle.eventIsolation.getEventCount();
    const timerCount = bundle.eventIsolation.getTimerCount();

    if (bundle.status === 'error') {
      issues.push(`${i18n.t('microfrontend.sandbox-manager.k4')}${bundle.error?.message ?? i18n.t('microfrontend.sandbox-manager.k0')}`);
    }
    if (jsActive && bundle.status !== 'active') {
      issues.push(i18n.t('microfrontend.sandbox-manager.k5'));
    }
    if (eventCount > 0 && bundle.status === 'inactive') {
      issues.push(`${i18n.t('microfrontend.sandbox-manager.k6')}${eventCount}${i18n.t('microfrontend.sandbox-manager.k7')}`);
    }
    if (timerCount > 50) {
      issues.push(`${i18n.t('microfrontend.sandbox-manager.k8')}${timerCount}${i18n.t('microfrontend.sandbox-manager.k9')}`);
    }

    return {
      moduleId,
      healthy: issues.length === 0 && bundle.status !== 'error',
      js: { active: jsActive, globalVarCount: jsGlobalVars },
      style: { mode: styleMode, styleCount },
      events: { active: bundle.eventIsolation.isActive?.() ?? false, eventCount, timerCount },
      issues,
      timestamp: Date.now(),
    };
  }

  /** 全局冲突报告（汇总所有沙箱） */
  getConflictReport(): ConflictReport {
    return conflictDetector.getConflictReport();
  }

  /** 全局泄漏报告（汇总所有沙箱的事件/定时器） */
  getLeakReport(): GlobalLeakReport {
    const modules: Array<{ moduleId: string; report: EventLeakReport }> = [];
    let totalEvents = 0;
    let totalTimers = 0;
    let leakyModuleCount = 0;
    let maxSeverity: 'info' | 'warning' | 'error' = 'info';

    for (const [moduleId, bundle] of this.sandboxes) {
      const report = bundle.eventIsolation.detectLeaks();
      modules.push({ moduleId, report });
      totalEvents += report.eventCount;
      totalTimers += report.timerCount;
      if (report.eventCount > 0 || report.timerCount > 0) {
        leakyModuleCount += 1;
      }
      if (report.severity === 'error') maxSeverity = 'error';
      else if (report.severity === 'warning' && maxSeverity !== 'error') maxSeverity = 'warning';
    }

    return {
      moduleCount: this.sandboxes.size,
      leakyModuleCount,
      totalEvents,
      totalTimers,
      modules,
      severity: maxSeverity,
    };
  }

  /** 销毁所有沙箱（用于应用退出或全局重置） */
  destroyAll(): void {
    for (const moduleId of Array.from(this.sandboxes.keys())) {
      this.destroySandbox(moduleId);
    }
  }

  /** 获取沙箱总数 */
  size(): number {
    return this.sandboxes.size;
  }
}

// 单例导出
export const sandboxManager = new SandboxManagerImpl();

// 兼容导出
export { SandboxManagerImpl as SandboxManager };
