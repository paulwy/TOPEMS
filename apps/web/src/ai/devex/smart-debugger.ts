export interface DebugSession {
  id: string;
  file: string;
  line: number;
  variables: Record<string, unknown>;
  callStack: CallStackFrame[];
  state: 'paused' | 'running' | 'stepping' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface CallStackFrame {
  functionName: string;
  file: string;
  line: number;
  column: number;
  variables: Record<string, unknown>;
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  hitCount: number;
  enabled: boolean;
}

export interface DebugSuggestion {
  id: string;
  type: 'performance' | 'logic' | 'security' | 'style' | 'bug';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  location?: { file: string; line: number };
}

export interface StateAnalysis {
  componentName: string;
  stateSize: number;
  changeFrequency: number;
  immutable: boolean;
  issues: string[];
}

function generateId(): string {
  return `dbg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class SmartDebugger {
  private static instance: SmartDebugger;

  private sessions: Map<string, DebugSession> = new Map();
  private breakpoints: Map<string, Breakpoint> = new Map();
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private currentSessionId: string | null = null;

  private constructor() {}

  static getInstance(): SmartDebugger {
    if (!SmartDebugger.instance) {
      SmartDebugger.instance = new SmartDebugger();
    }
    return SmartDebugger.instance;
  }

  createSession(file: string, line: number, variables: Record<string, unknown> = {}): DebugSession {
    const sessionId = generateId();
    const session: DebugSession = {
      id: sessionId,
      file,
      line,
      variables,
      callStack: [],
      state: 'paused',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    this.emit('session:created', session);
    return session;
  }

  setBreakpoint(file: string, line: number, condition?: string): Breakpoint {
    const bpId = generateId();
    const breakpoint: Breakpoint = {
      id: bpId,
      file,
      line,
      condition,
      hitCount: 0,
      enabled: true,
    };

    this.breakpoints.set(bpId, breakpoint);
    this.emit('breakpoint:set', breakpoint);
    return breakpoint;
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  getCurrentSession(): DebugSession | undefined {
    return this.currentSessionId ? this.sessions.get(this.currentSessionId) : undefined;
  }

  listSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  removeSession(sessionId: string): boolean {
    const existed = this.sessions.delete(sessionId);
    if (existed && this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    if (existed) {
      this.emit('session:removed', sessionId);
    }
    return existed;
  }

  listBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  updateBreakpoint(
    breakpointId: string,
    updates: Partial<Omit<Breakpoint, 'id'> | { enabled: boolean }>
  ): Breakpoint | null {
    const bp = this.breakpoints.get(breakpointId);
    if (!bp) return null;

    Object.assign(bp, updates);
    this.emit('breakpoint:updated', bp);
    return bp;
  }

  removeBreakpoint(breakpointId: string): boolean {
    const existed = this.breakpoints.delete(breakpointId);
    if (existed) {
      this.emit('breakpoint:removed', breakpointId);
    }
    return existed;
  }

  analyzeState(componentName: string, state: Record<string, unknown>): StateAnalysis {
    const issues: string[] = [];
    const stateSize = JSON.stringify(state).length;

    const changeFrequency = 0;
    let immutable = true;

    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          immutable = false;
          issues.push(`数组类型字段 "${key}" 可能导致不必要的重渲染`);
        } else {
          immutable = false;
          issues.push(`对象类型字段 "${key}" 引用不稳定`);
        }
      }
      if (value === undefined) {
        issues.push(`字段 "${key}" 为 undefined，可能导致条件渲染问题`);
      }
    }

    if (stateSize > 10000) {
      issues.push('状态对象过大，考虑拆分或使用 selector');
    }

    return {
      componentName,
      stateSize,
      changeFrequency,
      immutable,
      issues,
    };
  }

  suggestFix(sessionId: string): DebugSuggestion[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const suggestions: DebugSuggestion[] = [];

    if (session.state === 'paused') {
      suggestions.push({
        id: generateId(),
        type: 'bug',
        severity: 'high',
        message: '调试会话处于暂停状态',
        suggestion: '检查断点条件是否正确，或使用 step-over 继续执行',
        location: { file: session.file, line: session.line },
      });
    }

    const variableCount = Object.keys(session.variables).length;
    if (variableCount > 50) {
      suggestions.push({
        id: generateId(),
        type: 'performance',
        severity: 'medium',
        message: `变量数量过多 (${variableCount})`,
        suggestion: '减少组件中变量数量，使用解构或 useMemo 优化',
        location: { file: session.file, line: session.line },
      });
    }

    const callStackDepth = session.callStack.length;
    if (callStackDepth > 20) {
      suggestions.push({
        id: generateId(),
        type: 'performance',
        severity: 'high',
        message: `调用栈过深 (${callStackDepth} 层)`,
        suggestion: '可能存在递归调用或无限循环，检查终止条件',
        location: { file: session.file, line: session.line },
      });
    }

    const variableValues = Object.values(session.variables);
    const hasUndefined = variableValues.includes(undefined);
    if (hasUndefined) {
      suggestions.push({
        id: generateId(),
        type: 'logic',
        severity: 'medium',
        message: '存在 undefined 值',
        suggestion: '检查数据获取是否完成，添加空值检查或默认值',
        location: { file: session.file, line: session.line },
      });
    }

    return suggestions;
  }

  getCallStack(sessionId: string): CallStackFrame[] {
    const session = this.sessions.get(sessionId);
    return session?.callStack || [];
  }

  evaluateExpression(
    sessionId: string,
    expression: string
  ): { success: boolean; value: unknown; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, value: null, error: '会话不存在' };
    }

    try {
      const fn = new Function('session', `with(session.variables) { return ${expression}; }`);
      const value = fn(session);
      return { success: true, value };
    } catch (error) {
      return { success: false, value: null, error: String(error) };
    }
  }

  getDebugSuggestions(
    file: string,
    _line: number,
    _context?: Record<string, unknown>
  ): DebugSuggestion[] {
    const suggestions: DebugSuggestion[] = [];

    const enabledBreakpoints = Array.from(this.breakpoints.values()).filter(
      (bp) => bp.enabled && bp.file === file
    );

    if (enabledBreakpoints.length > 5) {
      suggestions.push({
        id: generateId(),
        type: 'style',
        severity: 'low',
        message: `当前文件有 ${enabledBreakpoints.length} 个启用的断点`,
        suggestion: '清理不需要的断点以保持调试整洁',
      });
    }

    const session = this.currentSessionId ? this.sessions.get(this.currentSessionId) : null;
    if (session && session.file === file) {
      const fixSuggestions = this.suggestFix(session.id);
      suggestions.push(...fixSuggestions);
    }

    return suggestions;
  }

  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void);
    return () => this.off(event, callback);
  }

  off<T = unknown>(event: string, callback: (data: T) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as (data: unknown) => void);
    }
  }

  private emit(event: string, data: unknown): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch {
          // ignore
        }
      });
    }
  }

  destroy(): void {
    this.sessions.clear();
    this.breakpoints.clear();
    this.listeners.clear();
    this.currentSessionId = null;
  }
}

export const smartDebugger = SmartDebugger.getInstance();
