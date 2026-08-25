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
