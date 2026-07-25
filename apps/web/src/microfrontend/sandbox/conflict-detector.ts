/**
 * V42.0 Track F: 微前端企业级 — 冲突检测器
 *
 * 单例 ConflictDetector，收集所有微前端模块的全局变量、CSS 选择器、事件注册，
 * 提供 detectConflicts() 全局冲突检测与 getConflictReport() 报告。
 *
 * 冲突类型:
 * - GlobalVarConflict: 两个模块修改同一全局变量
 * - StyleConflict: 两个模块使用相同 CSS 选择器
 * - EventConflict: 两个模块监听同一事件（可能冒泡冲突）
 *
 * 冲突严重级别: info / warning / error
 */

// ==================== 类型定义 ====================

export type ConflictSeverity = 'info' | 'warning' | 'error';

export interface GlobalVarConflict {
  /** 冲突的全局变量名 */
  varName: string;
  /** 涉及的模块 */
  modules: string[];
  /** 冲突时间戳 */
  timestamp: number;
  /** 严重级别 */
  severity: ConflictSeverity;
}

export interface StyleConflict {
  /** 冲突的 CSS 选择器 */
  selector: string;
  /** 涉及的模块 */
  modules: string[];
  /** 冲突时间戳 */
  timestamp: number;
  /** 严重级别 */
  severity: ConflictSeverity;
}

export interface EventConflict {
  /** 冲突的事件类型 */
  eventType: string;
  /** 涉及的模块 */
  modules: string[];
  /** 冲突时间戳 */
  timestamp: number;
  /** 严重级别 */
  severity: ConflictSeverity;
}

export interface ConflictReport {
  /** 检测时间戳 */
  timestamp: number;
  /** 全局变量冲突列表 */
  globalVarConflicts: GlobalVarConflict[];
  /** 样式冲突列表 */
  styleConflicts: StyleConflict[];
  /** 事件冲突列表 */
  eventConflicts: EventConflict[];
  /** 总冲突数 */
  total: number;
  /** 按严重级别统计 */
  bySeverity: Record<ConflictSeverity, number>;
}

// ==================== ConflictDetector（单例） ====================

class ConflictDetectorImpl {
  /** 全局变量注册表: varName -> Set<moduleId> */
  private readonly globalVarRegistry = new Map<string, Set<string>>();
  /** CSS 选择器注册表: selector -> Set<moduleId> */
  private readonly styleRegistry = new Map<string, Set<string>>();
  /** 事件注册表: eventType -> Set<moduleId> */
  private readonly eventRegistry = new Map<string, Set<string>>();
  /** 历史冲突记录（去重） */
  private readonly history: ConflictReport = {
    timestamp: Date.now(),
    globalVarConflicts: [],
    styleConflicts: [],
    eventConflicts: [],
    total: 0,
    bySeverity: { info: 0, warning: 0, error: 0 },
  };

  /**
   * 注册模块使用的全局变量
   */
  registerGlobalVar(moduleId: string, varName: string): void {
    if (!this.globalVarRegistry.has(varName)) {
      this.globalVarRegistry.set(varName, new Set());
    }
    this.globalVarRegistry.get(varName)!.add(moduleId);
  }

  /**
   * 注册模块使用的 CSS 选择器
   */
  registerStyle(moduleId: string, selector: string): void {
    if (!this.styleRegistry.has(selector)) {
      this.styleRegistry.set(selector, new Set());
    }
    this.styleRegistry.get(selector)!.add(moduleId);
  }

  /**
   * 注册模块监听的事件类型
   */
  registerEvent(moduleId: string, eventType: string): void {
    if (!this.eventRegistry.has(eventType)) {
      this.eventRegistry.set(eventType, new Set());
    }
    this.eventRegistry.get(eventType)!.add(moduleId);
  }

  /**
   * 全局冲突检测
   *
   * 扫描三个注册表，找出被多个模块使用的项，按严重级别归类：
   * - info: 2 个模块共用
   * - warning: 3-4 个模块共用
   * - error: 5+ 个模块共用
   */
  detectConflicts(): ConflictReport {
    const globalVarConflicts: GlobalVarConflict[] = [];
    const styleConflicts: StyleConflict[] = [];
    const eventConflicts: EventConflict[] = [];

    const now = Date.now();

    // 全局变量冲突
    for (const [varName, modules] of this.globalVarRegistry) {
      if (modules.size >= 2) {
        const severity = this.classifySeverity(modules.size);
        globalVarConflicts.push({
          varName,
          modules: Array.from(modules),
          timestamp: now,
          severity,
        });
      }
    }

    // 样式冲突
    for (const [selector, modules] of this.styleRegistry) {
      if (modules.size >= 2) {
        const severity = this.classifySeverity(modules.size);
        styleConflicts.push({
          selector,
          modules: Array.from(modules),
          timestamp: now,
          severity,
        });
      }
    }

    // 事件冲突
    for (const [eventType, modules] of this.eventRegistry) {
      if (modules.size >= 2) {
        const severity = this.classifySeverity(modules.size);
        eventConflicts.push({
          eventType,
          modules: Array.from(modules),
          timestamp: now,
          severity,
        });
      }
    }

    const total = globalVarConflicts.length + styleConflicts.length + eventConflicts.length;
    const bySeverity: Record<ConflictSeverity, number> = { info: 0, warning: 0, error: 0 };
    for (const c of globalVarConflicts) bySeverity[c.severity] += 1;
    for (const c of styleConflicts) bySeverity[c.severity] += 1;
    for (const c of eventConflicts) bySeverity[c.severity] += 1;

    const report: ConflictReport = {
      timestamp: now,
      globalVarConflicts,
      styleConflicts,
      eventConflicts,
      total,
      bySeverity,
    };

    // 更新历史
    this.history.timestamp = now;
    this.history.globalVarConflicts = globalVarConflicts;
    this.history.styleConflicts = styleConflicts;
    this.history.eventConflicts = eventConflicts;
    this.history.total = total;
    this.history.bySeverity = bySeverity;

    return report;
  }

  /** 获取最近一次的冲突报告（若从未执行 detectConflicts，会自动触发一次） */
  getConflictReport(): ConflictReport {
    if (this.history.timestamp === 0 || this.history.total === -1) {
      return this.detectConflicts();
    }
    // 每次调用都重新检测，确保最新
    return this.detectConflicts();
  }

  /** 清空指定模块的所有注册 */
  clearModule(moduleId: string): void {
    for (const [, modules] of this.globalVarRegistry) {
      modules.delete(moduleId);
    }
    for (const [, modules] of this.styleRegistry) {
      modules.delete(moduleId);
    }
    for (const [, modules] of this.eventRegistry) {
      modules.delete(moduleId);
    }
    // 清理空 Set
    this.cleanupEmpty(this.globalVarRegistry);
    this.cleanupEmpty(this.styleRegistry);
    this.cleanupEmpty(this.eventRegistry);
  }

  /** 重置整个冲突检测器 */
  reset(): void {
    this.globalVarRegistry.clear();
    this.styleRegistry.clear();
    this.eventRegistry.clear();
    this.history.globalVarConflicts = [];
    this.history.styleConflicts = [];
    this.history.eventConflicts = [];
    this.history.total = 0;
    this.history.bySeverity = { info: 0, warning: 0, error: 0 };
    this.history.timestamp = Date.now();
  }

  /** 获取所有已注册的全局变量名 */
  getRegisteredGlobalVars(): string[] {
    return Array.from(this.globalVarRegistry.keys());
  }

  /** 获取所有已注册的 CSS 选择器 */
  getRegisteredStyles(): string[] {
    return Array.from(this.styleRegistry.keys());
  }

  /** 获取所有已注册的事件类型 */
  getRegisteredEvents(): string[] {
    return Array.from(this.eventRegistry.keys());
  }

  // ==================== 内部实现 ====================

  /** 根据涉及模块数判断严重级别 */
  private classifySeverity(moduleCount: number): ConflictSeverity {
    if (moduleCount >= 5) return 'error';
    if (moduleCount >= 3) return 'warning';
    return 'info';
  }

  /** 清理 Map 中空的 Set */
  private cleanupEmpty<K>(map: Map<K, Set<string>>): void {
    for (const [key, set] of map) {
      if (set.size === 0) {
        map.delete(key);
      }
    }
  }
}

// 单例导出
export const conflictDetector = new ConflictDetectorImpl();

// 兼容导出（便于在需要时直接引用类）
export { ConflictDetectorImpl as ConflictDetector };
