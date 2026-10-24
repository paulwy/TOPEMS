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
