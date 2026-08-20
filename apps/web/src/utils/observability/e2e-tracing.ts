import { logger } from '../logger';
import i18n from '@/i18n';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  status: SpanStatus;
}

interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime?: number;
}

interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  samplingRate: number;
  exporter: 'console' | 'http' | 'batch';
  exporterEndpoint?: string;
  maxSpansPerTrace: number;
  enableAutoTracing: {
    pageLoad: boolean;
    apiRequests: boolean;
    userInteraction: boolean;
    componentRender: boolean;
    routeChange: boolean;
  };
  traceContextHeader: string;
  ignoredUrls: (string | RegExp)[];
}

const defaultConfig: TracingConfig = {
  enabled: true,
  serviceName: 'topems-web',
  serviceVersion: '1.0.0',
  samplingRate: 1.0,
  exporter: 'console',
  maxSpansPerTrace: 1000,
  enableAutoTracing: {
    pageLoad: true,
    apiRequests: true,
    userInteraction: true,
    componentRender: false,
    routeChange: true,
  },
  traceContextHeader: 'traceparent',
  ignoredUrls: [/\/health$/, /\/metrics$/],
};

function generateId(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateTraceId(): string {
  return generateId(32);
}

function generateSpanId(): string {
  return generateId(16);
}

class E2ETracer {
  private config: TracingConfig;
  private currentTrace: Trace | null = null;
  private spanStack: Span[] = [];
  private activeSpans: Map<string, Span> = new Map();
  private initialized = false;
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

  constructor(config: Partial<TracingConfig> = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      enableAutoTracing: {
        ...defaultConfig.enableAutoTracing,
        ...config.enableAutoTracing,
      },
    };
  }

  init(): void {
    if (this.initialized || !this.config.enabled) return;

    if (this.config.enableAutoTracing.apiRequests) {
      this.instrumentFetch();
      this.instrumentXHR();
    }

    if (this.config.enableAutoTracing.pageLoad && typeof window !== 'undefined') {
      this.tracePageLoad();
    }

    if (this.config.enableAutoTracing.userInteraction && typeof window !== 'undefined') {
      this.instrumentUserInteractions();
    }

    this.initialized = true;
    logger.info(i18n.t('shared.e2e-tracing.k0'));
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  getCurrentTraceId(): string | null {
    return this.currentTrace?.traceId || null;
  }

  getCurrentSpanId(): string | null {
    const currentSpan = this.spanStack[this.spanStack.length - 1];
    return currentSpan?.spanId || null;
  }

  startSpan(
    name: string,
    options: {
      parentSpanId?: string;
      attributes?: Record<string, string | number | boolean>;
      startTime?: number;
    } = {}
  ): Span {
    if (!this.config.enabled || !this.shouldSample()) {
      return this.createNoopSpan(name);
    }

    const traceId = this.currentTrace?.traceId || generateTraceId();
    const spanId = generateSpanId();
    const parentSpanId = options.parentSpanId || this.spanStack[this.spanStack.length - 1]?.spanId;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: options.startTime || Date.now(),
      attributes: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
        ...options.attributes,
      },
      events: [],
      status: { code: SpanStatusCode.UNSET },
    };

    if (!this.currentTrace) {
      this.currentTrace = {
        traceId,
        spans: [],
        startTime: span.startTime,
      };
    }

    if (this.currentTrace.spans.length < this.config.maxSpansPerTrace) {
      this.currentTrace.spans.push(span);
    }

    this.activeSpans.set(spanId, span);
    this.spanStack.push(span);

    return span;
  }

  endSpan(span: Span, endTime?: number): void {
    if (span.endTime !== undefined) return;

    span.endTime = endTime || Date.now();
    span.duration = span.endTime - span.startTime;

    if (span.status.code === SpanStatusCode.UNSET) {
      span.status.code = SpanStatusCode.OK;
    }

    this.activeSpans.delete(span.spanId);

    const stackIndex = this.spanStack.findIndex((s) => s.spanId === span.spanId);
    if (stackIndex !== -1) {
      this.spanStack.splice(stackIndex, 1);
    }

    if (this.spanStack.length === 0 && this.currentTrace) {
      this.currentTrace.endTime = span.endTime;
      this.exportTrace(this.currentTrace);
    }
  }

  setSpanAttribute(span: Span, key: string, value: string | number | boolean): void {
    span.attributes[key] = value;
  }

  addSpanEvent(
    span: Span,
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  setSpanStatus(span: Span, code: SpanStatusCode, message?: string): void {
    span.status = { code, message };
  }

  async traceAsync<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const span = this.startSpan(name, { attributes });
    try {
      const result = await fn();
      this.setSpanStatus(span, SpanStatusCode.OK);
      return result;
    } catch (error) {
      this.setSpanStatus(
        span,
        SpanStatusCode.ERROR,
        error instanceof Error ? error.message : String(error)
      );
      this.addSpanEvent(span, 'error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack || '' : '',
      });
      throw error;
    } finally {
      this.endSpan(span);
    }
  }

  traceSync<T>(
    name: string,
    fn: () => T,
    attributes?: Record<string, string | number | boolean>
  ): T {
    const span = this.startSpan(name, { attributes });
    try {
      const result = fn();
      this.setSpanStatus(span, SpanStatusCode.OK);
      return result;
    } catch (error) {
      this.setSpanStatus(
        span,
        SpanStatusCode.ERROR,
        error instanceof Error ? error.message : String(error)
      );
      this.addSpanEvent(span, 'error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack || '' : '',
      });
      throw error;
    } finally {
      this.endSpan(span);
    }
  }

  injectTraceContext(headers: Record<string, string>): Record<string, string> {
    const currentSpan = this.spanStack[this.spanStack.length - 1];
    if (!currentSpan) return headers;

    const traceFlags = currentSpan.status.code === SpanStatusCode.ERROR ? '00' : '01';
    const traceparent = `00-${currentSpan.traceId}-${currentSpan.spanId}-${traceFlags}`;

    return {
      ...headers,
      [this.config.traceContextHeader]: traceparent,
      tracestate: '',
    };
  }

  extractTraceContext(headers: Record<string, string>): {
    traceId?: string;
    spanId?: string;
    traceFlags?: number;
  } | null {
    const traceparent = headers[this.config.traceContextHeader] || headers['traceparent'];
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;

    return {
      traceId: parts[1],
      spanId: parts[2],
      traceFlags: parseInt(parts[3], 16),
    };
  }

  private createNoopSpan(name: string): Span {
    return {
      traceId: '',
      spanId: '',
      name,
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: { code: SpanStatusCode.UNSET },
    };
  }

  private instrumentFetch(): void {
    if (typeof window === 'undefined' || !window.fetch) return;

    this.originalFetch = window.fetch;
    const tracer = this;

    window.fetch = function tracedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();

      if (tracer.isIgnoredUrl(url)) {
        return tracer.originalFetch!.call(window, input, init);
      }

      const span = tracer.startSpan(`http.client:${init?.method || 'GET'}`, {
        attributes: {
          'http.method': init?.method || 'GET',
          'http.url': url,
          'http.host': new URL(url, window.location.origin).host,
        },
      });

      const newHeaders = new Headers(init?.headers || {});
      tracer.injectTraceContext(Object.fromEntries(newHeaders.entries()));

      return tracer
        .originalFetch!.call(window, input, {
          ...init,
          headers: newHeaders,
        })
        .then((response) => {
          tracer.setSpanAttribute(span, 'http.status_code', response.status);
          tracer.setSpanAttribute(
            span,
            'http.response_content_length',
            response.headers.get('content-length') || 0
          );

          if (response.ok) {
            tracer.setSpanStatus(span, SpanStatusCode.OK);
          } else {
            tracer.setSpanStatus(span, SpanStatusCode.ERROR, `HTTP ${response.status}`);
          }

          tracer.endSpan(span);
          return response;
        })
        .catch((error) => {
          tracer.setSpanStatus(
            span,
            SpanStatusCode.ERROR,
            error instanceof Error ? error.message : String(error)
          );
          tracer.endSpan(span);
          throw error;
        });
    };
  }

  private instrumentXHR(): void {
    if (typeof window === 'undefined' || !window.XMLHttpRequest) return;

    const tracer = this;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    const spanMap = new WeakMap<XMLHttpRequest, Span>();

    XMLHttpRequest.prototype.open = function tracedOpen(
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ): void {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (!tracer.isIgnoredUrl(urlStr)) {
        const span = tracer.startSpan(`http.client:${method}`, {
          attributes: {
            'http.method': method,
            'http.url': urlStr,
          },
        });
        spanMap.set(this, span);
      }

      return tracer.originalXHROpen!.call(
        this,
        method,
        url,
        ...(rest as [boolean, string?, string?])
      );
    };

    XMLHttpRequest.prototype.send = function tracedSend(...args: unknown[]): void {
      const span = spanMap.get(this);

      if (span) {
        const headers = tracer.injectTraceContext({});
        Object.entries(headers).forEach(([key, value]) => {
          try {
            this.setRequestHeader(key, value);
          } catch {
            // ignore
          }
        });

        this.addEventListener('load', () => {
          tracer.setSpanAttribute(span, 'http.status_code', this.status);
          if (this.status >= 200 && this.status < 400) {
            tracer.setSpanStatus(span, SpanStatusCode.OK);
          } else {
            tracer.setSpanStatus(span, SpanStatusCode.ERROR, `HTTP ${this.status}`);
          }
          tracer.endSpan(span);
        });

        this.addEventListener('error', () => {
          tracer.setSpanStatus(span, SpanStatusCode.ERROR, 'Network error');
          tracer.endSpan(span);
        });

        this.addEventListener('abort', () => {
          tracer.setSpanStatus(span, SpanStatusCode.ERROR, 'Request aborted');
          tracer.endSpan(span);
        });
      }

      return tracer.originalXHRSend!.call(this, ...(args as [XMLHttpRequestBodyInit | null]));
    };
  }

  private instrumentUserInteractions(): void {
    if (typeof document === 'undefined') return;

    const tracer = this;

    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        const elementName =
          target.tagName.toLowerCase() +
          (target.id ? `#${target.id}` : '') +
          (target.className ? `.${String(target.className).split(' ').join('.')}` : '');

        tracer.startSpan(`user.click:${elementName}`, {
          attributes: {
            'user.action': 'click',
            'element.tag': target.tagName,
            'element.id': target.id || '',
            'element.text': target.textContent?.substring(0, 100) || '',
          },
        });

        if (tracer.spanStack.length > 0) {
          const span = tracer.spanStack[tracer.spanStack.length - 1];
          setTimeout(() => tracer.endSpan(span), 0);
        }
      },
      true
    );
  }

  private tracePageLoad(): void {
    if (typeof window === 'undefined') return;

    const span = this.startSpan('page.load', {
      attributes: {
        'page.url': window.location.href,
        'page.path': window.location.pathname,
      },
    });

    if (document.readyState === 'complete') {
      this.captureNavigationMetrics(span);
      this.endSpan(span);
    } else {
      window.addEventListener('load', () => {
        this.captureNavigationMetrics(span);
        this.endSpan(span);
      });
    }
  }

  private captureNavigationMetrics(span: Span): void {
    if (typeof performance === 'undefined') return;

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      this.setSpanAttribute(span, 'navigation.duration', nav.duration);
      this.setSpanAttribute(span, 'navigation.domInteractive', nav.domInteractive);
      this.setSpanAttribute(span, 'navigation.domContentLoaded', nav.domContentLoadedEventEnd);
      this.setSpanAttribute(span, 'navigation.loadEventEnd', nav.loadEventEnd);
      this.setSpanAttribute(span, 'navigation.redirectCount', nav.redirectCount);
    }

    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      this.setSpanAttribute(span, `paint.${entry.name}`, entry.startTime);
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

  private exportTrace(trace: Trace): void {
    switch (this.config.exporter) {
      case 'console':
        this.exportToConsole(trace);
        break;
      case 'http':
        this.exportToHttp(trace);
        break;
      case 'batch':
        this.exportToBatch(trace);
        break;
    }
  }

  private exportToConsole(trace: Trace): void {
    logger.debug(
      `[Trace] ${trace.traceId} (${trace.spans.length} spans, ${((trace.endTime || Date.now()) - trace.startTime).toFixed(2)}ms)`,
      trace.spans.map((s) => ({
        span: s.name,
        duration: s.duration ? `${s.duration}ms` : 'pending',
        status: SpanStatusCode[s.status.code],
      }))
    );
  }

  private exportToHttp(trace: Trace): void {
    if (!this.config.exporterEndpoint) return;

    const payload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: this.config.serviceName } },
              { key: 'service.version', value: { stringValue: this.config.serviceVersion } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'e2e-tracer', version: '1.0.0' },
              spans: trace.spans.map((span) => ({
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                startTimeUnixNano: span.startTime * 1e6,
                endTimeUnixNano: (span.endTime || Date.now()) * 1e6,
                status: {
                  code: span.status.code,
                  message: span.status.message,
                },
                attributes: Object.entries(span.attributes).map(([key, value]) => ({
                  key,
                  value: {
                    stringValue: typeof value === 'string' ? value : String(value),
                  },
                })),
              })),
            },
          ],
        },
      ],
    };

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(this.config.exporterEndpoint, JSON.stringify(payload));
    } else {
      fetch(this.config.exporterEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }

  private batchBuffer: Trace[] = [];
  private batchTimer: number | null = null;

  private exportToBatch(trace: Trace): void {
    this.batchBuffer.push(trace);

    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(() => {
        this.flushBatch();
      }, 5000);
    }
  }

  private flushBatch(): void {
    if (this.batchBuffer.length === 0) return;

    const traces = [...this.batchBuffer];
    this.batchBuffer = [];
    this.batchTimer = null;

    if (this.config.exporterEndpoint) {
      traces.forEach((trace) => this.exportToHttp(trace));
    }
  }

  flush(): void {
    if (this.batchBuffer.length > 0) {
      this.flushBatch();
    }
  }

  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  getConfig(): TracingConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<TracingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      enableAutoTracing: {
        ...this.config.enableAutoTracing,
        ...config.enableAutoTracing,
      },
    };
  }

  destroy(): void {
    if (this.originalFetch && typeof window !== 'undefined') {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (this.originalXHROpen && this.originalXHRSend) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHROpen = null;
      this.originalXHRSend = null;
    }

    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.currentTrace = null;
    this.spanStack = [];
    this.activeSpans.clear();
    this.batchBuffer = [];
    this.initialized = false;
  }
}

const e2eTracer = new E2ETracer();
export default e2eTracer;
