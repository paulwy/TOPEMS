import { logger } from '../logger';
import i18n from '@/i18n';

export enum ReplayEventType {
  SNAPSHOT = 'snapshot',
  CLICK = 'click',
  INPUT = 'input',
  SCROLL = 'scroll',
  MOUSEMOVE = 'mousemove',
  NAVIGATION = 'navigation',
  NETWORK = 'network',
  CONSOLE = 'console',
  RESIZE = 'resize',
  FOCUS = 'focus',
  BLUR = 'blur',
}

export interface ReplayEvent<T = unknown> {
  timestamp: number;
  type: ReplayEventType;
  data: T;
}

export interface SnapshotData {
  html: string;
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  url: string;
}

export interface ClickData {
  x: number;
  y: number;
  targetSelector: string;
  targetText: string;
}

export interface InputData {
  targetSelector: string;
  value: string;
  isMasked: boolean;
  inputType: string;
}

export interface ScrollData {
  scrollX: number;
  scrollY: number;
}

export interface MouseMoveData {
  x: number;
  y: number;
}

export interface NavigationData {
  from: string;
  to: string;
}

export interface NetworkData {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}

export interface ConsoleData {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  args?: string[];
  stack?: string;
}

export interface ResizeData {
  width: number;
  height: number;
}

export interface ReplaySession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  events: ReplayEvent[];
  metadata: {
    userAgent: string;
    url: string;
    viewport: {
      width: number;
      height: number;
    };
    platform: string;
    language: string;
  };
}

export interface ReplayConfig {
  enabled: boolean;
  sessionId?: string;
  maxEvents: number;
  maxDuration: number;
  samplingRate: number;
  enablePrivacy: boolean;
  maskAllInputs: boolean;
  maskInputTypes: string[];
  maskSelectors: string[];
  unmaskSelectors: string[];
  enableNetworkRecording: boolean;
  enableConsoleRecording: boolean;
  enableMouseMove: boolean;
  mouseMoveSampleRate: number;
  snapshotInterval: number;
  ignoredUrls: (string | RegExp)[];
  onEvent?: (event: ReplayEvent) => void;
  onSessionEnd?: (session: ReplaySession) => void;
}

const defaultConfig: ReplayConfig = {
  enabled: true,
  maxEvents: 10000,
  maxDuration: 30 * 60 * 1000,
  samplingRate: 0.1,
  enablePrivacy: true,
  maskAllInputs: true,
  maskInputTypes: ['password', 'email', 'tel', 'text', 'textarea', 'search'],
  maskSelectors: ['.mask', '[data-mask]', '[type="password"]'],
  unmaskSelectors: ['.unmask', '[data-unmask]'],
  enableNetworkRecording: true,
  enableConsoleRecording: true,
  enableMouseMove: false,
  mouseMoveSampleRate: 50,
  snapshotInterval: 5000,
  ignoredUrls: [/\/health$/, /\/metrics$/],
};

function generateSessionId(): string {
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

function getSelector(element: Element): string {
  if (element.id) return `#${element.id}`;

  const path: string[] = [];
  let el: Element | null = element;

  while (el && el.nodeType === Node.ELEMENT_NODE && path.length < 5) {
    let selector = el.tagName.toLowerCase();

    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === el!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    el = el.parentElement;
  }

  return path.join(' > ');
}

export class SessionReplayer {
  private config: ReplayConfig;
  private session: ReplaySession | null = null;
  private recording = false;
  private eventCount = 0;
  private lastMouseMoveTime = 0;
  private snapshotTimer: number | null = null;
  private originalFetch: typeof fetch | null = null;
  private originalConsole: Record<string, (...args: unknown[]) => void> = {};
  private boundHandlers: Map<string, EventListener> = new Map();

  constructor(config: Partial<ReplayConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  start(): string {
    if (!this.config.enabled || this.recording) {
      return this.session?.sessionId || '';
    }

    if (Math.random() > this.config.samplingRate) {
      logger.debug(i18n.t('shared.session-replay.k0'));
      return '';
    }

    const sessionId = this.config.sessionId || generateSessionId();

    this.session = {
      sessionId,
      startTime: Date.now(),
      events: [],
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        viewport: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0,
        },
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
        language: typeof navigator !== 'undefined' ? navigator.language : '',
      },
    };

    this.recording = true;
    this.eventCount = 0;

    this.captureSnapshot();
    this.setupEventListeners();
    this.startSnapshotTimer();

    if (this.config.enableNetworkRecording) {
      this.instrumentNetwork();
    }

    if (this.config.enableConsoleRecording) {
      this.instrumentConsole();
    }

    logger.info(`${i18n.t('shared.session-replay.k1')}${sessionId}`);
    return sessionId;
  }

  stop(): ReplaySession | null {
    if (!this.recording || !this.session) return null;

    this.recording = false;
    this.session.endTime = Date.now();
    this.session.duration = this.session.endTime - this.session.startTime;

    this.cleanup();

    if (this.config.onSessionEnd) {
      this.config.onSessionEnd(this.session);
    }

    logger.info(
      `${i18n.t('shared.session-replay.k2')}${this.session.sessionId} (${this.session.events.length} events)`
    );

    return this.session;
  }

  pause(): void {
    this.recording = false;
    if (this.snapshotTimer !== null) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  resume(): void {
    if (!this.session) return;
    this.recording = true;
    this.startSnapshotTimer();
  }

  getSession(): ReplaySession | null {
    return this.session;
  }

  getSessionId(): string | null {
    return this.session?.sessionId || null;
  }

  getEventCount(): number {
    return this.eventCount;
  }

  isRecording(): boolean {
    return this.recording;
  }

  private addEvent(type: ReplayEventType, data: unknown): void {
    if (!this.recording || !this.session) return;

    if (this.eventCount >= this.config.maxEvents) {
      this.stop();
      return;
    }

    if (this.session.duration !== undefined && this.session.duration >= this.config.maxDuration) {
      this.stop();
      return;
    }

    const event: ReplayEvent = {
      timestamp: Date.now(),
      type,
      data,
    };

    this.session.events.push(event);
    this.eventCount++;

    if (this.config.onEvent) {
      this.config.onEvent(event);
    }
  }

  private captureSnapshot(): void {
    if (typeof document === 'undefined') return;

    const html = this.config.enablePrivacy
      ? this.maskSensitiveContent(document.documentElement.outerHTML)
      : document.documentElement.outerHTML;

    const snapshot: SnapshotData = {
      html,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      url: window.location.href,
    };

    this.addEvent(ReplayEventType.SNAPSHOT, snapshot);
  }

  private maskSensitiveContent(html: string): string {
    let masked = html;

    const inputPattern = /<input[^>]*type="([^"]*)"[^>]*value="([^"]*)"[^>]*>/gi;
    masked = masked.replace(inputPattern, (match, type, value) => {
      if (this.config.maskInputTypes.includes(type)) {
        return match.replace(value, '*'.repeat(Math.min(value.length, 12)));
      }
      return match;
    });

    const textareaPattern = /<textarea[^>]*>([\s\S]*?)<\/textarea>/gi;
    masked = masked.replace(textareaPattern, (match, content) => {
      return match.replace(content, '*'.repeat(Math.min(content.length, 12)));
    });

    return masked;
  }

  private isElementMasked(element: HTMLElement): boolean {
    if (this.config.maskAllInputs) {
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        const type = (element as HTMLInputElement).type?.toLowerCase() || '';
        if (this.config.maskInputTypes.includes(type) || tagName === 'textarea') {
          return true;
        }
      }
    }

    for (const selector of this.config.maskSelectors) {
      if (element.matches(selector)) {
        return true;
      }
    }

    for (const selector of this.config.unmaskSelectors) {
      if (element.matches(selector)) {
        return false;
      }
    }

    return false;
  }

  private setupEventListeners(): void {
    if (typeof document === 'undefined') return;

    this.addBoundListener('click', this.handleClick.bind(this), true);
    this.addBoundListener('input', this.handleInput.bind(this), true);
    this.addBoundListener('scroll', this.handleScroll.bind(this), true);

    if (this.config.enableMouseMove) {
      this.addBoundListener('mousemove', this.handleMouseMove.bind(this), true);
    }

    this.addBoundListener('resize', this.handleResize.bind(this), true);
    this.addBoundListener('focusin', this.handleFocus.bind(this), true);
    this.addBoundListener('focusout', this.handleBlur.bind(this), true);

    window.addEventListener('popstate', this.handleNavigation.bind(this));
    window.addEventListener('hashchange', this.handleNavigation.bind(this));
  }

  private addBoundListener(eventName: string, handler: EventListener, capture: boolean): void {
    document.addEventListener(eventName, handler, capture);
    this.boundHandlers.set(eventName, handler);
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    const data: ClickData = {
      x: (event as MouseEvent).clientX,
      y: (event as MouseEvent).clientY,
      targetSelector: getSelector(target),
      targetText: this.config.enablePrivacy
        ? this.maskText(target.textContent?.substring(0, 100) || '')
        : target.textContent?.substring(0, 100) || '',
    };

    this.addEvent(ReplayEventType.CLICK, data);
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLElement;
    const isMasked = this.isElementMasked(target as HTMLElement);
    const value = isMasked
      ? '*'.repeat(Math.min((target as HTMLInputElement).value?.length || 0, 12))
      : (target as HTMLInputElement).value;

    const data: InputData = {
      targetSelector: getSelector(target),
      value: value || '',
      isMasked,
      inputType: (target as HTMLInputElement).type || 'text',
    };

    this.addEvent(ReplayEventType.INPUT, data);
  }

  private handleScroll(): void {
    const data: ScrollData = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };

    this.addEvent(ReplayEventType.SCROLL, data);
  }

  private handleMouseMove(event: Event): void {
    const now = Date.now();
    if (now - this.lastMouseMoveTime < this.config.mouseMoveSampleRate) return;
    this.lastMouseMoveTime = now;

    const data: MouseMoveData = {
      x: (event as MouseEvent).clientX,
      y: (event as MouseEvent).clientY,
    };

    this.addEvent(ReplayEventType.MOUSEMOVE, data);
  }

  private handleResize(): void {
    const data: ResizeData = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.addEvent(ReplayEventType.RESIZE, data);
  }

  private handleFocus(event: Event): void {
    const target = event.target as HTMLElement;
    this.addEvent(ReplayEventType.FOCUS, {
      targetSelector: getSelector(target),
    });
  }

  private handleBlur(event: Event): void {
    const target = event.target as HTMLElement;
    this.addEvent(ReplayEventType.BLUR, {
      targetSelector: getSelector(target),
    });
  }

  private handleNavigation(): void {
    const data: NavigationData = {
      from: this.session?.metadata.url || '',
      to: window.location.href,
    };

    if (this.session) {
      this.session.metadata.url = window.location.href;
    }

    this.addEvent(ReplayEventType.NAVIGATION, data);
    this.captureSnapshot();
  }

  private instrumentNetwork(): void {
    if (typeof window === 'undefined' || !window.fetch) return;

    this.originalFetch = window.fetch;
    const replayer = this;

    window.fetch = function tracedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();

      if (replayer.isIgnoredUrl(url)) {
        return replayer.originalFetch!.call(window, input, init);
      }

      const startTime = Date.now();
      const requestSize = init?.body ? new Blob([init.body as BlobPart]).size : 0;

      return replayer
        .originalFetch!.call(window, input, init)
        .then((response) => {
          const data: NetworkData = {
            method: init?.method || 'GET',
            url,
            status: response.status,
            duration: Date.now() - startTime,
            requestSize,
            responseSize: parseInt(response.headers.get('content-length') || '0'),
          };
          replayer.addEvent(ReplayEventType.NETWORK, data);
          return response;
        })
        .catch((error) => {
          const data: NetworkData = {
            method: init?.method || 'GET',
            url,
            duration: Date.now() - startTime,
            requestSize,
            error: error instanceof Error ? error.message : String(error),
          };
          replayer.addEvent(ReplayEventType.NETWORK, data);
          throw error;
        });
    };
  }

  private instrumentConsole(): void {
    if (typeof console === 'undefined') return;

    const consoleRef = console;
    const levels: ('log' | 'info' | 'warn' | 'error')[] = ['log', 'info', 'warn', 'error'];
    const replayer = this;

    levels.forEach((level) => {
      replayer.originalConsole[level] = consoleRef[level].bind(consoleRef);

      consoleRef[level] = function (...args: unknown[]) {
        const data: ConsoleData = {
          level,
          message: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '),
          args: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))),
        };

        if (level === 'error') {
          const error = args.find((a) => a instanceof Error) as Error | undefined;
          if (error) {
            data.stack = error.stack;
          }
        }

        replayer.addEvent(ReplayEventType.CONSOLE, data);

        replayer.originalConsole[level]!(...args);
      };
    });
  }

  private isIgnoredUrl(url: string): boolean {
    return this.config.ignoredUrls.some((pattern) => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      }
      return pattern.test(url);
    });
  }

  private maskText(text: string): string {
    if (!this.config.enablePrivacy) return text;
    return text;
  }

  private startSnapshotTimer(): void {
    if (this.snapshotTimer !== null) return;

    this.snapshotTimer = window.setInterval(() => {
      this.captureSnapshot();
    }, this.config.snapshotInterval);
  }

  private cleanup(): void {
    if (this.snapshotTimer !== null) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    this.boundHandlers.forEach((handler, eventName) => {
      document.removeEventListener(eventName, handler, true);
    });
    this.boundHandlers.clear();

    window.removeEventListener('popstate', this.handleNavigation.bind(this));
    window.removeEventListener('hashchange', this.handleNavigation.bind(this));

    if (this.originalFetch && typeof window !== 'undefined') {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (Object.keys(this.originalConsole).length > 0) {
      Object.entries(this.originalConsole).forEach(([level, fn]) => {
        (console as unknown as Record<string, unknown>)[level] = fn;
      });
      this.originalConsole = {};
    }
  }

  setConfig(config: Partial<ReplayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ReplayConfig {
    return { ...this.config };
  }

  exportSession(): ReplaySession | null {
    if (!this.session) return null;
    return JSON.parse(JSON.stringify(this.session));
  }

  importSession(session: ReplaySession): void {
    this.session = JSON.parse(JSON.stringify(session));
  }

  destroy(): void {
    this.stop();
    this.session = null;
    this.eventCount = 0;
  }
}

export const sessionReplayer = new SessionReplayer();
export default sessionReplayer;
