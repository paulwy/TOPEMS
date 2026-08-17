/**
 * V42.0 Track F: 微前端企业级 — JS 运行时沙箱
 *
 * 基于 ES6 Proxy 实现 window/document 代理:
 * - 新增全局变量记录在沙箱内部 Map（隔离）
 * - 已有全局变量直接透传（只读代理）
 * - window 修改操作拦截
 * - 全局变量冲突检测
 *
 * @example
 * const sandbox = new JavaScriptSandbox('crm', { allowGlobals: ['React'] });
 * sandbox.activate();
 * sandbox.execScript('window.__crm_config = { host: "crm" }');
 * sandbox.getGlobalVars(); // Map { '__crm_config' => {...} }
 * sandbox.deactivate();
 */

import { conflictDetector } from './conflict-detector';
import i18n from '@/i18n';

// ==================== 类型定义 ====================

export interface SandboxOptions {
  /** 允许访问的全局变量白名单（不在此列表的“已有”变量仍可读，用于显式声明） */
  allowGlobals?: string[];
  /** 禁止访问的全局变量（访问/写入时抛错或返回 undefined） */
  denyGlobals?: string[];
  /** 是否拦截 window 修改（true 时写入会记录到沙箱内部，false 时透传到真实 window） */
  interceptWindow?: boolean;
  /** 内存限制（MB，简化为记录，不强制） */
  maxMemoryMB?: number;
}

export interface GlobalVarConflict {
  /** 冲突的全局变量名 */
  varName: string;
  /** 涉及的模块 */
  modules: string[];
  /** 冲突时间戳 */
  timestamp: number;
  /** 严重级别 */
  severity: 'info' | 'warning' | 'error';
}

// ==================== 工具函数 ====================

/** 内置全局变量白名单（这些是 JS 标准或浏览器基础 API，允许透传） */
const BUILTIN_GLOBALS = new Set<string>([
  'undefined',
  'NaN',
  'Infinity',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'Object',
  'Function',
  'Array',
  'Number',
  'String',
  'Boolean',
  'Symbol',
  'Date',
  'Promise',
  'RegExp',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'JSON',
  'Math',
  'Intl',
  'ArrayBuffer',
  'Uint8Array',
  'Uint16Array',
  'Uint32Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Float32Array',
  'Float64Array',
  'DataView',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Proxy',
  'Reflect',
  'console',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'performance',
  'crypto',
  'atob',
  'btoa',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'URL',
  'URLSearchParams',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'Blob',
  'File',
  'FileReader',
  'AbortController',
  'Event',
  'CustomEvent',
  'EventTarget',
  'MessageChannel',
  'MessagePort',
  'location',
  'history',
  'navigator',
  'screen',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document',
  'window',
  'self',
  'globalThis',
]);

// ==================== JavaScriptSandbox ====================

/**
 * JS 运行时沙箱
 *
 * 使用 Proxy 代理 window，将模块写入的全局变量记录在沙箱内部 Map，
 * 模块卸载时可一次性清理，避免全局污染。
 */
export class JavaScriptSandbox {
  /** 模块 ID（用于冲突检测与日志） */
  readonly moduleId: string;
  /** 沙箱配置 */
  readonly options: Required<SandboxOptions>;
  /** 沙箱内新增的全局变量（key -> value） */
  private readonly globalVars = new Map<string, unknown>();
  /** 沙箱内新增的全局变量原始值快照（用于 deactivate 时恢复） */
  private readonly originalValues = new Map<string, unknown>();
  /** 沙箱内被删除的原生全局变量名（用于恢复） */
  private readonly deletedKeys = new Set<string>();
  /** 是否处于激活状态 */
  private active = false;
  /** window 代理对象 */
  private proxyWindow: unknown = null;
  /** document 代理对象 */
  private proxyDocument: unknown = null;
  /** 已检测到的冲突列表 */
  private readonly conflicts: GlobalVarConflict[] = [];
  /** 当前活跃的沙箱（用于全局激活栈） */
  private static activeStack: JavaScriptSandbox[] = [];

  constructor(moduleId: string, options: SandboxOptions = {}) {
    this.moduleId = moduleId;
    this.options = {
      allowGlobals: options.allowGlobals ?? [],
      denyGlobals: options.denyGlobals ?? [],
      interceptWindow: options.interceptWindow ?? true,
      maxMemoryMB: options.maxMemoryMB ?? 64,
    };
  }

  /**
   * 激活沙箱（代理 window/document）
   *
   * 多沙箱场景使用栈结构，最近激活的沙箱位于栈顶，
   * 拦截的写入会进入该沙箱内部。
   */
  activate(): void {
    if (this.active) return;
    this.active = true;

    // 创建 window 代理
    this.proxyWindow = this.createWindowProxy();
    // 创建 document 代理（仅拦截自定义属性）
    this.proxyDocument = this.createDocumentProxy();

    JavaScriptSandbox.activeStack.push(this);
  }

  /** 停用沙箱（恢复 window） */
  deactivate(): void {
    if (!this.active) return;
    this.active = false;

    // 从激活栈中移除
    const idx = JavaScriptSandbox.activeStack.indexOf(this);
    if (idx >= 0) {
      JavaScriptSandbox.activeStack.splice(idx, 1);
    }

    // 恢复被修改的原始全局变量
    if (typeof window !== 'undefined') {
      for (const [key, value] of this.originalValues) {
        try {
          (window as any)[key] = value;
        } catch {
          /* ignore */
        }
      }
      // 恢复被删除的 key
      for (const key of this.deletedKeys) {
        try {
          // 不能完全恢复原值，至少确保 key 存在
          if (!(key in window)) {
            (window as any)[key] = undefined;
          }
        } catch {
          /* ignore */
        }
      }
    }

    this.originalValues.clear();
    this.deletedKeys.clear();
    this.proxyWindow = null;
    this.proxyDocument = null;
  }

  /**
   * 在沙箱中执行脚本
   *
   * 通过 with + Proxy 将脚本内的 window 引用重定向到代理 window。
   * 注意: 仅支持非严格模式代码的 window 隐式重定向，
   * 严格模式代码需显式使用 sandbox.window。
   */
  execScript(code: string): unknown {
    if (!this.active) {
      throw new Error(
        `${i18n.t('microfrontend.js-sandbox.k0')}${this.moduleId}${i18n.t('microfrontend.js-sandbox.k1')}`
      );
    }

    try {
      // 使用 Function 构造器执行代码，将代理 window 注入为参数

      const runner = new Function(
        'window',
        'document',
        'self',
        'globalThis',
        `"use strict";\n${code}`
      );
      return runner(this.proxyWindow, this.proxyDocument, this.proxyWindow, this.proxyWindow);
    } catch (err) {
      console.error(
        `${i18n.t('microfrontend.js-sandbox.k2')}${this.moduleId}${i18n.t('microfrontend.js-sandbox.k3')}`,
        err
      );
      throw err;
    }
  }

  /** 获取沙箱内添加的全局变量 Map（key -> value） */
  getGlobalVars(): Map<string, unknown> {
    return new Map(this.globalVars);
  }

  /** 设置沙箱内全局变量（同时触发冲突检测） */
  setGlobalVar(name: string, value: unknown): void {
    if (this.options.denyGlobals.includes(name)) {
      console.warn(
        `${i18n.t('microfrontend.js-sandbox.k4')}${this.moduleId}${i18n.t('microfrontend.js-sandbox.k5')}${name}`
      );
      return;
    }

    // 记录原始值（首次写入时）
    if (!this.originalValues.has(name) && typeof window !== 'undefined' && name in window) {
      this.originalValues.set(name, (window as any)[name]);
    }

    this.globalVars.set(name, value);

    // 同步到真实 window（当不拦截时）或代理 window 内部
    if (this.options.interceptWindow && typeof window !== 'undefined') {
      // 仍写入真实 window 以兼容第三方库读取，但记录用于清理
      try {
        (window as any)[name] = value;
      } catch {
        /* ignore */
      }
    }

    // 注册到冲突检测器
    conflictDetector.registerGlobalVar(this.moduleId, name);
  }

  /** 清理沙箱（释放所有引用） */
  clear(): void {
    this.deactivate();
    this.globalVars.clear();
    this.conflicts.length = 0;
  }

  // ==================== 冲突检测 ====================

  /**
   * 检测全局变量冲突
   *
   * 比较沙箱内部新增的全局变量与冲突检测器中其他模块注册的变量，
   * 发现同名注册则记录冲突。
   */
  detectGlobalVarConflicts(): GlobalVarConflict[] {
    const found: GlobalVarConflict[] = [];
    const report = conflictDetector.getConflictReport();
    for (const conflict of report.globalVarConflicts) {
      if (conflict.modules.includes(this.moduleId)) {
        found.push({
          varName: conflict.varName,
          modules: conflict.modules,
          timestamp: conflict.timestamp,
          severity: conflict.severity,
        });
      }
    }
    this.conflicts.push(...found);
    return found;
  }

  /** 报告冲突（手动报告） */
  reportConflict(varName: string, moduleA: string, moduleB: string): void {
    const conflict: GlobalVarConflict = {
      varName,
      modules: [moduleA, moduleB],
      timestamp: Date.now(),
      severity: 'warning',
    };
    this.conflicts.push(conflict);
  }

  /** 获取已记录的冲突列表 */
  getConflicts(): GlobalVarConflict[] {
    return [...this.conflicts];
  }

  /** 沙箱是否激活 */
  isActive(): boolean {
    return this.active;
  }

  /** 获取代理 window（供外部 React 渲染等使用） */
  getProxyWindow(): unknown {
    return this.proxyWindow;
  }

  /** 获取代理 document */
  getProxyDocument(): unknown {
    return this.proxyDocument;
  }

  // ==================== 内部实现 ====================

  /** 创建 window 代理 */
  private createWindowProxy(): unknown {
    const sandbox = this;
    const target = typeof window !== 'undefined' ? window : {};
    const intercept = this.options.interceptWindow;
    const deny = new Set(this.options.denyGlobals);

    return new Proxy(target, {
      get(_target, prop: string | symbol) {
        const key = String(prop);
        // 拦截访问 self/window/globalThis 引用，返回代理
        if (key === 'window' || key === 'self' || key === 'globalThis') {
          return sandbox.proxyWindow;
        }
        if (key === 'document') {
          return sandbox.proxyDocument;
        }
        // 禁止访问的变量
        if (deny.has(key)) {
          console.warn(
            `${i18n.t('microfrontend.js-sandbox.k6')}${sandbox.moduleId}${i18n.t('microfrontend.js-sandbox.k7')}${key}`
          );
          return;
        }
        // 优先返回沙箱内部变量
        if (sandbox.globalVars.has(key)) {
          return sandbox.globalVars.get(key);
        }
        // 透传原生 window
        try {
          const value = (target as any)[key];
          // 函数绑定 this 到真实 window（避免非法调用）
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        } catch {
          return;
        }
      },

      set(_target, prop: string | symbol, value: unknown): boolean {
        const key = String(prop);
        if (deny.has(key)) {
          console.warn(
            `${i18n.t('microfrontend.js-sandbox.k8')}${sandbox.moduleId}${i18n.t('microfrontend.js-sandbox.k9')}${key}`
          );
          {
            i18n.t('microfrontend.js-sandbox.returntrue_0');
          }
        }
        // 记录原始值（首次写入时）
        if (!sandbox.originalValues.has(key) && key in target) {
          sandbox.originalValues.set(key, (target as any)[key]);
        }
        // 记录到沙箱内部
        sandbox.globalVars.set(key, value);

        if (intercept) {
          // 拦截模式：仅记录到沙箱内部，不写入真实 window
          return true;
        }
        // 非拦截模式：透传到真实 window
        try {
          (target as any)[key] = value;
        } catch {
          /* ignore */
        }
        return true;
      },

      has(_target, prop: string | symbol): boolean {
        const key = String(prop);
        if (deny.has(key)) return false;
        return sandbox.globalVars.has(key) || key in target;
      },

      deleteProperty(_target, prop: string | symbol): boolean {
        const key = String(prop);
        if (sandbox.globalVars.has(key)) {
          sandbox.globalVars.delete(key);
          return true;
        }
        if (key in target) {
          sandbox.deletedKeys.add(key);
          try {
            delete (target as any)[key];
          } catch {
            /* ignore */
          }
        }
        return true;
      },

      ownKeys(_target): (string | symbol)[] {
        const keys = new Set<string | symbol>();
        for (const k of Object.keys(target)) keys.add(k);
        for (const k of sandbox.globalVars.keys()) keys.add(k);
        return Array.from(keys);
      },

      getOwnPropertyDescriptor(_target, prop: string | symbol) {
        const key = String(prop);
        if (sandbox.globalVars.has(key)) {
          return {
            configurable: true,
            enumerable: true,
            value: sandbox.globalVars.get(key),
            writable: true,
          };
        }
        const desc = Object.getOwnPropertyDescriptor(target, prop);
        return desc;
      },
    });
  }

  /** 创建 document 代理（只读透传 + 写入拦截记录） */
  private createDocumentProxy(): unknown {
    const sandbox = this;
    const target = typeof document !== 'undefined' ? document : {};
    return new Proxy(target, {
      get(_target, prop: string | symbol) {
        const key = String(prop);
        try {
          const value = (target as any)[key];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        } catch {
          return;
        }
      },
      set(_target, prop: string | symbol, value: unknown): boolean {
        const key = String(prop);
        // document 的写入通常不拦截，但记录
        console.info(
          `${i18n.t('microfrontend.js-sandbox.k10')}${sandbox.moduleId}${i18n.t('microfrontend.js-sandbox.document_11')}${key}`
        );
        try {
          (target as any)[prop] = value;
        } catch {
          /* ignore */
        }
        return true;
      },
    });
  }
}

/**
 * 判断全局变量是否为内置 API（可安全透传）
 */
export function isBuiltinGlobal(name: string): boolean {
  return BUILTIN_GLOBALS.has(name);
}
