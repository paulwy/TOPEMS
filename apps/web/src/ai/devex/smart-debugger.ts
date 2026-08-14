import i18n from '@/i18n';
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
          issues.push(`${i18n.t('ai.smart-debugger.k0')}${key}${i18n.t('ai.smart-debugger.k1')}`);
        } else {
          immutable = false;
          issues.push(`${i18n.t('ai.smart-debugger.k2')}${key}${i18n.t('ai.smart-debugger.k3')}`);
        }
      }
      if (value === undefined) {
        issues.push(`${i18n.t('ai.smart-debugger.k4')}${key}${i18n.t('ai.smart-debugger.k5')}`);
      }
    }

    if (stateSize > 10000) {
      issues.push(i18n.t('ai.smart-debugger.k0'));
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
        message: i18n.t('ai.smart-debugger.k1'),
        suggestion: i18n.t('ai.smart-debugger.k2'),
        location: { file: session.file, line: session.line },
      });
    }

    const variableCount = Object.keys(session.variables).length;
    if (variableCount > 50) {
      suggestions.push({
        id: generateId(),
        type: 'performance',
        severity: 'medium',
        message: `${i18n.t('ai.smart-debugger.k6')}${variableCount})`,
        suggestion: i18n.t('ai.smart-debugger.k3'),
        location: { file: session.file, line: session.line },
      });
    }

    const callStackDepth = session.callStack.length;
    if (callStackDepth > 20) {
      suggestions.push({
        id: generateId(),
        type: 'performance',
        severity: 'high',
        message: `${i18n.t('ai.smart-debugger.k7')}${callStackDepth}${i18n.t('ai.smart-debugger.k8')}`,
        suggestion: i18n.t('ai.smart-debugger.k4'),
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
        message: i18n.t('ai.smart-debugger.undefined_5'),
        suggestion: i18n.t('ai.smart-debugger.k6'),
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
      return { success: false, value: null, error: i18n.t('ai.smart-debugger.k7') };
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
        message: `${i18n.t('ai.smart-debugger.k9')}${enabledBreakpoints.length}${i18n.t('ai.smart-debugger.k10')}`,
        suggestion: i18n.t('ai.smart-debugger.k8'),
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
