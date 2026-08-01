import { moduleRegistry, type ModuleRegistration } from '../registry/module-registry';
import { dependencyGovernor, type DependencyGraph } from '../governance/dependency-governor';

export type ComponentNodeType = 'function' | 'class' | 'memo' | 'lazy' | 'suspense';

export interface ComponentTreeNode {
  id: string;
  name: string;
  type: ComponentNodeType;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  hooks: string[];
  children: ComponentTreeNode[];
  renderCount: number;
  lastRenderTime: number;
}

export type StateStoreType = 'redux' | 'zustand' | 'context' | 'mobx' | 'recoil' | 'jotai';

export interface StateStoreInfo {
  type: StateStoreType;
  name: string;
  state: Record<string, unknown>;
  selectors: string[];
  actions: string[];
  subscriberCount: number;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: number;
  duration?: number;
  status?: number;
  responseSize?: number;
  type: 'fetch' | 'xhr' | 'resource';
  initiator?: string;
}

export interface PerformanceTimelineEvent {
  id: string;
  name: string;
  category: 'render' | 'load' | 'network' | 'state' | 'lifecycle' | 'custom';
  startTime: number;
  duration: number;
  data?: Record<string, unknown>;
}

export interface DebugSessionStep {
  id: string;
  type: 'action' | 'state-change' | 'render' | 'network' | 'error';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface DebugSession {
  id: string;
  name: string;
  createdAt: number;
  steps: DebugSessionStep[];
  duration: number;
  metadata: {
    userAgent: string;
    url: string;
    viewport: { width: number; height: number };
    moduleCount: number;
  };
}

export interface ErrorBoundaryTestResult {
  componentId: string;
  error: Error;
  caught: boolean;
  recoveryAttempted: boolean;
  timestamp: number;
}

export type HotReloadStatus = 'idle' | 'detecting' | 'reloading' | 'success' | 'failed';

export interface HotReloadState {
  status: HotReloadStatus;
  moduleId?: string;
  timestamp: number;
  error?: string;
}

type FetchInterceptor = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type XHRInterceptor = () => void;

const MAX_NETWORK_LOG = 500;
const MAX_TIMELINE_EVENTS = 1000;
const MAX_SESSION_STEPS = 2000;

function generateId(): string {
  return `dbg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[Unserializable]';
  }
}

export class SmartDebugger {
  private static instance: SmartDebugger;

  private componentTree: ComponentTreeNode[] = [];
  private stateStores: Map<string, StateStoreInfo> = new Map();
  private networkLog: NetworkRequest[] = [];
  private timeline: PerformanceTimelineEvent[] = [];
  private sessions: Map<string, DebugSession> = new Map();
  private hotReloadState: HotReloadState = { status: 'idle', timestamp: 0 };
  private errorBoundaryResults: ErrorBoundaryTestResult[] = [];

  private originalFetch?: typeof fetch;
  private originalXHROpen?: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend?: typeof XMLHttpRequest.prototype.send;
  private fetchInterceptor?: FetchInterceptor;
  private xhrInterceptor?: XHRInterceptor;

  private isRecording = false;
  private currentSessionId: string | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  private constructor() {}

  static getInstance(): SmartDebugger {
    if (!SmartDebugger.instance) {
      SmartDebugger.instance = new SmartDebugger();
    }
    return SmartDebugger.instance;
  }

  // ==================== Component Tree Inspection ====================

  inspectComponentTree(root?: HTMLElement): ComponentTreeNode[] {
    const target = root || document.getElementById('root') || document.body;
    const result = this.walkComponentTree(target, 0);
    this.componentTree = result;
    this.emit('component-tree', result);
    return result;
  }

  private walkComponentTree(element: HTMLElement, depth: number): ComponentTreeNode[] {
    if (depth > 20) return [];

    const nodes: ComponentTreeNode[] = [];
    const reactKey = Object.keys(element).find((k) =>
      k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );

    if (reactKey) {
      try {
        const fiber = (element as unknown as Record<string, unknown>)[reactKey] as {
          type?: { name?: string; displayName?: string };
          elementType?: { name?: string; displayName?: string };
          memoizedProps?: Record<string, unknown>;
          memoizedState?: Array<{ queue?: unknown }>;
          child?: unknown;
        };

        const name =
          fiber?.type?.name ||
          fiber?.type?.displayName ||
          fiber?.elementType?.name ||
          fiber?.elementType?.displayName ||
          'Anonymous';

        const props = (fiber?.memoizedProps as Record<string, unknown>) || {};
        const hooks: string[] = [];
        if (fiber?.memoizedState) {
          let current: { queue?: unknown } | null = fiber.memoizedState as { queue?: unknown } | null;
          let idx = 0;
          while (current) {
            hooks.push(`hook_${idx}`);
            current = (current as { next?: { queue?: unknown } }).next || null;
            idx++;
            if (idx > 50) break;
          }
        }

        nodes.push({
          id: `${name}_${Math.random().toString(36).slice(2, 8)}`,
          name,
          type: this.inferComponentType(fiber),
          props,
          state: {},
          hooks,
          children: [],
          renderCount: (fiber?.memoizedProps ? 1 : 0),
          lastRenderTime: performance.now(),
        });
      } catch {
        // ignore
      }
    }

    const children = Array.from(element.children) as HTMLElement[];
    for (const child of children) {
      const childNodes = this.walkComponentTree(child, depth + 1);
      nodes.push(...childNodes);
    }

    return nodes;
  }

  private inferComponentType(fiber: {
    type?: Record<string, unknown>;
    elementType?: Record<string, unknown>;
  }): ComponentNodeType {
    const type = fiber.type || fiber.elementType;
    if (!type) return 'function';
    if (typeof type === 'function') {
      const prototype = (type as unknown as { prototype?: { isReactComponent?: boolean } }).prototype;
      if (prototype && prototype.isReactComponent) return 'class';
      return 'function';
    }
    if (type.$$typeof === Symbol.for('react.memo')) return 'memo';
    if (type.$$typeof === Symbol.for('react.lazy')) return 'lazy';
    return 'function';
  }

  getComponentTree(): ComponentTreeNode[] {
    return this.componentTree;
  }

  findComponentByName(name: string): ComponentTreeNode | undefined {
    return this.componentTree.find(
      (n) => n.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  // ==================== State Inspection ====================

  registerStateStore(store: StateStoreInfo): void {
    this.stateStores.set(store.name, store);
    this.emit('state-store:registered', store);
  }

  unregisterStateStore(name: string): void {
    this.stateStores.delete(name);
    this.emit('state-store:unregistered', name);
  }

  getStateStore(name: string): StateStoreInfo | undefined {
    return this.stateStores.get(name);
  }

  getAllStateStores(): StateStoreInfo[] {
    return Array.from(this.stateStores.values());
  }

  inspectReduxState(): StateStoreInfo | null {
    const w = window as unknown as {
      __REDUX_STORE__?: { getState: () => unknown; subscribe: (fn: () => void) => () => void };
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    };
    if (w.__REDUX_STORE__) {
      const store = w.__REDUX_STORE__;
      const state = store.getState() as Record<string, unknown>;
      return {
        type: 'redux',
        name: '__REDUX_STORE__',
        state,
        selectors: Object.keys(state),
        actions: [],
        subscriberCount: 0,
      };
    }
    return null;
  }

  inspectZustandStores(): StateStoreInfo[] {
    const results: StateStoreInfo[] = [];
    const w = window as unknown as Record<string, unknown>;
    for (const key of Object.keys(w)) {
      try {
        const val = w[key];
        if (
          typeof val === 'function' &&
          (val as { getState?: () => unknown }).getState &&
          (val as { subscribe?: (fn: () => void) => () => void }).subscribe
        ) {
          const store = val as unknown as { getState: () => Record<string, unknown>; subscribe: (fn: () => void) => () => void };
          const state = store.getState();
          results.push({
            type: 'zustand',
            name: key,
            state,
            selectors: Object.keys(state),
            actions: Object.keys(state).filter((k) => typeof state[k] === 'function'),
            subscriberCount: 0,
          });
        }
      } catch {
        // skip
      }
    }
    return results;
  }

  // ==================== Module Dependency Graph ====================

  getModuleDependencyGraph(): DependencyGraph {
    return dependencyGovernor.analyzeDependencies().graph;
  }

  getModuleInfo(moduleId: string): ModuleRegistration | undefined {
    return moduleRegistry.getModule(moduleId);
  }

  getModuleDependencies(moduleId: string): string[] {
    const mod = moduleRegistry.getModule(moduleId);
    return mod?.dependencies || [];
  }

  getAllLoadedModules(): ModuleRegistration[] {
    return moduleRegistry.listModules();
  }

  // ==================== Network Request Interception ====================

  startNetworkInterception(): void {
    if (this.fetchInterceptor) return;

    this.originalFetch = window.fetch;
    this.fetchInterceptor = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';
      const requestId = generateId();
      const startTime = performance.now();

      const record: NetworkRequest = {
        id: requestId,
        url,
        method,
        headers: (init?.headers as Record<string, string>) || {},
        body: init?.body,
        timestamp: Date.now(),
        type: 'fetch',
      };

      this.networkLog.push(record);
      this.trimNetworkLog();
      this.emit('network:start', record);

      try {
        const response = await this.originalFetch!.apply(window, [input, init]);
        const duration = performance.now() - startTime;

        record.duration = duration;
        record.status = response.status;
        record.responseSize = 0;

        this.emit('network:complete', record);
        return response;
      } catch (error) {
        record.duration = performance.now() - startTime;
        record.status = 0;
        this.emit('network:error', { ...record, error: String(error) });
        throw error;
      }
    };

    window.fetch = this.fetchInterceptor as typeof fetch;

    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    this.xhrInterceptor = () => {
      const xhr = new XMLHttpRequest();
      const originalSend = xhr.send.bind(xhr);
      const requestId = generateId();
      let startTime = 0;

      xhr.addEventListener('loadstart', () => {
        startTime = performance.now();
        const record: NetworkRequest = {
          id: requestId,
          url: xhr.responseURL || '',
          method: (xhr as XMLHttpRequest & { method?: string }).method || 'GET',
          headers: {},
          timestamp: Date.now(),
          type: 'xhr',
        };
        this.networkLog.push(record);
        this.trimNetworkLog();
        this.emit('network:start', record);
      });

      xhr.addEventListener('load', () => {
        const duration = performance.now() - startTime;
        const record = this.networkLog.find((r) => r.id === requestId);
        if (record) {
          record.duration = duration;
          record.status = xhr.status;
          record.responseSize = (xhr.responseText?.length || 0);
          this.emit('network:complete', record);
        }
      });

      xhr.addEventListener('error', () => {
        const duration = performance.now() - startTime;
        const record = this.networkLog.find((r) => r.id === requestId);
        if (record) {
          record.duration = duration;
          record.status = xhr.status || 0;
          this.emit('network:error', record);
        }
      });

      xhr.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
        return originalSend(body);
      };

      return xhr;
    };

    this.emit('network:interception:started', null);
  }

  stopNetworkInterception(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = undefined;
      this.fetchInterceptor = undefined;
    }
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      XMLHttpRequest.prototype.send = this.originalXHRSend!;
      this.originalXHROpen = undefined;
      this.originalXHRSend = undefined;
      this.xhrInterceptor = undefined;
    }
    this.emit('network:interception:stopped', null);
  }

  getNetworkLog(): NetworkRequest[] {
    return [...this.networkLog];
  }

  clearNetworkLog(): void {
    this.networkLog = [];
    this.emit('network:log:cleared', null);
  }

  private trimNetworkLog(): void {
    if (this.networkLog.length > MAX_NETWORK_LOG) {
      this.networkLog = this.networkLog.slice(-MAX_NETWORK_LOG);
    }
  }

  // ==================== Performance Timeline ====================

  recordTimelineEvent(event: Omit<PerformanceTimelineEvent, 'id'>): void {
    const fullEvent: PerformanceTimelineEvent = { ...event, id: generateId() };
    this.timeline.push(fullEvent);
    if (this.timeline.length > MAX_TIMELINE_EVENTS) {
      this.timeline = this.timeline.slice(-MAX_TIMELINE_EVENTS);
    }
    this.emit('timeline:event', fullEvent);
  }

  getTimeline(): PerformanceTimelineEvent[] {
    return [...this.timeline];
  }

  clearTimeline(): void {
    this.timeline = [];
    this.emit('timeline:cleared', null);
  }

  // ==================== Error Boundary Testing ====================

  testErrorBoundary(componentId: string, error: Error): ErrorBoundaryTestResult {
    const result: ErrorBoundaryTestResult = {
      componentId,
      error,
      caught: false,
      recoveryAttempted: false,
      timestamp: Date.now(),
    };

    this.errorBoundaryResults.push(result);
    if (this.errorBoundaryResults.length > 100) {
      this.errorBoundaryResults = this.errorBoundaryResults.slice(-100);
    }

    this.emit('error-boundary:test', result);
    return result;
  }

  getErrorBoundaryResults(): ErrorBoundaryTestResult[] {
    return [...this.errorBoundaryResults];
  }

  // ==================== Hot Reload ====================

  triggerHotReload(moduleId: string): HotReloadState {
    this.hotReloadState = { status: 'detecting', moduleId, timestamp: Date.now() };
    this.emit('hot-reload:detecting', this.hotReloadState);

    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && (window as unknown as { location: Location }).location) {
          const w = window as unknown as { __webpack_hot_middleware?: unknown };
          if (w.__webpack_hot_middleware || moduleId) {
            this.hotReloadState = { status: 'reloading', moduleId, timestamp: Date.now() };
            this.emit('hot-reload:reloading', this.hotReloadState);

            setTimeout(() => {
              this.hotReloadState = { status: 'success', moduleId, timestamp: Date.now() };
              this.emit('hot-reload:success', this.hotReloadState);
            }, 500);
          } else {
            this.hotReloadState = { status: 'failed', moduleId, timestamp: Date.now(), error: 'No HMR available' };
            this.emit('hot-reload:failed', this.hotReloadState);
          }
        }
      } catch (e) {
        this.hotReloadState = {
          status: 'failed',
          moduleId,
          timestamp: Date.now(),
          error: String(e),
        };
        this.emit('hot-reload:failed', this.hotReloadState);
      }
    }, 100);

    return this.hotReloadState;
  }

  getHotReloadState(): HotReloadState {
    return { ...this.hotReloadState };
  }

  // ==================== Debug Sessions ====================

  startSession(name?: string): DebugSession {
    const sessionId = generateId();
    const session: DebugSession = {
      id: sessionId,
      name: name || `Session ${new Date().toISOString()}`,
      createdAt: Date.now(),
      steps: [],
      duration: 0,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        moduleCount: moduleRegistry.listModules().length,
      },
    };

    this.sessions.set(sessionId, session);
    this.isRecording = true;
    this.currentSessionId = sessionId;

    this.emit('session:started', session);
    return session;
  }

  addSessionStep(step: Omit<DebugSessionStep, 'id' | 'timestamp'>): void {
    if (!this.isRecording || !this.currentSessionId) return;

    const fullStep: DebugSessionStep = {
      ...step,
      id: generateId(),
      timestamp: Date.now(),
    };

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.steps.push(fullStep);
      if (session.steps.length > MAX_SESSION_STEPS) {
        session.steps = session.steps.slice(-MAX_SESSION_STEPS);
      }
    }
  }

  stopSession(): DebugSession | null {
    if (!this.currentSessionId) return null;

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.duration = Date.now() - session.createdAt;
    }

    this.isRecording = false;
    this.currentSessionId = null;
    this.emit('session:stopped', session);
    return session || null;
  }

  replaySession(sessionId: string): DebugSessionStep[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const replayed: DebugSessionStep[] = [];
    for (const step of session.steps) {
      replayed.push(step);
      this.emit('session:replay:step', step);
    }

    this.emit('session:replay:complete', session);
    return replayed;
  }

  getSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';
    return safeStringify(session);
  }

  importSession(json: string): DebugSession | null {
    try {
      const session = JSON.parse(json) as DebugSession;
      this.sessions.set(session.id, session);
      this.emit('session:imported', session);
      return session;
    } catch {
      return null;
    }
  }

  deleteSession(sessionId: string): boolean {
    const existed = this.sessions.delete(sessionId);
    if (existed) {
      this.emit('session:deleted', sessionId);
    }
    return existed;
  }

  isRecordingSession(): boolean {
    return this.isRecording;
  }

  // ==================== Event System ====================

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

  // ==================== DevTools Protocol Integration ====================

  getDevToolsProtocolInfo(): Record<string, unknown> {
    return {
      componentTree: this.componentTree.length,
      stateStores: this.stateStores.size,
      networkRequests: this.networkLog.length,
      timelineEvents: this.timeline.length,
      sessions: this.sessions.size,
      hotReloadState: this.hotReloadState,
      isRecording: this.isRecording,
    };
  }

  destroy(): void {
    this.stopNetworkInterception();
    this.stopSession();
    this.componentTree = [];
    this.stateStores.clear();
    this.networkLog = [];
    this.timeline = [];
    this.sessions.clear();
    this.errorBoundaryResults = [];
    this.listeners.clear();
  }
}

export const smartDebugger = SmartDebugger.getInstance();