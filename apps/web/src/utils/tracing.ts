/**
 * @deprecated V26.0: 此模块已弃用，请使用 `@/utils/telemetry` 中的 OpenTelemetry SDK 实现。
 * 保留此文件仅用于向后兼容，新项目请使用 telemetry.ts 中的 `initTelemetry`,
 * `injectTraceContext`, `startSpan`, `traceAsync` 等函数。
 */

import config from '../config/runtime';

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface Span {
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, string | number | boolean>;
  parentSpanId?: string;
  spanContext: SpanContext;
}

let currentTraceId: string | null = null;
let currentSpanId: string | null = null;

function resetTrace(): void {
  currentTraceId = null;
  currentSpanId = null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateTraceId(): string {
  return generateId().padStart(32, '0').substring(0, 32);
}

export function startTrace(): SpanContext {
  const traceId = generateTraceId();
  const spanId = generateId().substring(0, 16);
  currentTraceId = traceId;
  currentSpanId = spanId;
  return {
    traceId,
    spanId,
    traceFlags: 1,
  };
}

export function getCurrentTraceId(): string | null {
  return currentTraceId;
}

export function getCurrentSpanId(): string | null {
  return currentSpanId;
}

function createSpan(name: string, parentSpanId?: string): Span {
  const spanId = generateId().substring(0, 16);
  currentSpanId = spanId;
  return {
    name,
    startTime: Date.now(),
    spanContext: {
      traceId: currentTraceId || generateTraceId(),
      spanId,
      traceFlags: 1,
    },
    parentSpanId,
  };
}

export function endSpan(span: Span, attributes?: Record<string, string | number | boolean>): void {
  span.endTime = Date.now();
  if (attributes) {
    span.attributes = { ...span.attributes, ...attributes };
  }
  sendSpanToCollector(span);
}

function getTraceHeaders(): Record<string, string> {
  if (!currentTraceId || !currentSpanId) {
    return {};
  }
  return {
    traceparent: `00-${currentTraceId}-${currentSpanId}-01`,
    tracestate: '',
    'x-request-id': currentTraceId,
  };
}

function sendSpanToCollector(span: Span): void {
  const tracingEnabled = config.features.debugMode;
  if (!tracingEnabled) return;

  const jaegerEndpoint = config.services.jaeger || 'http://localhost:14268/api/traces';

  const spanData = {
    traceId: span.spanContext.traceId,
    spanId: span.spanContext.spanId,
    operationName: span.name,
    startTime: span.startTime * 1000000,
    duration: span.endTime ? (span.endTime - span.startTime) * 1000000 : 0,
    tags: [
      { key: 'component', type: 'string', value: 'topems-web' },
      { key: 'service.name', type: 'string', value: 'topems-web' },
      ...(span.attributes
        ? Object.entries(span.attributes).map(([key, value]) => ({
            key,
            type:
              typeof value === 'string' ? 'string' : typeof value === 'number' ? 'float64' : 'bool',
            value: String(value),
          }))
        : []),
    ],
    references: span.parentSpanId
      ? [{ refType: 'CHILD_OF', traceId: span.spanContext.traceId, spanId: span.parentSpanId }]
      : [],
  };

  fetch(jaegerEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: 'service.name', type: 'string', value: 'topems-web' }],
          },
          instrumentationLibrarySpans: [
            {
              instrumentationLibrary: { name: 'topems-web', version: '1.0.0' },
              spans: [spanData],
            },
          ],
        },
      ],
    }),
  }).catch(() => {});
}

export function instrumentFetch(originalFetch: typeof fetch): typeof fetch {
  return async function tracedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const headers = init?.headers || {};
    const traceHeaders = getTraceHeaders();

    const newHeaders = {
      ...headers,
      ...traceHeaders,
    };

    const span = createSpan(`fetch: ${typeof input === 'string' ? input : input.toString()}`);

    try {
      const response = await originalFetch(input, { ...init, headers: newHeaders });
      endSpan(span, {
        status: response.status,
        url: typeof input === 'string' ? input : input.toString(),
        method: init?.method || 'GET',
      });
      return response;
    } catch (error) {
      endSpan(span, {
        error: true,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

interface AxiosInterceptorConfig {
  headers?: Record<string, string>;
}

interface AxiosResponse {
  config?: AxiosInterceptorConfig;
}

interface AxiosInterceptorManager<T> {
  use(
    onFulfilled?: (value: T) => T | Promise<T>,
    onRejected?: (error: unknown) => Promise<never>
  ): number;
}

interface AxiosInstance {
  interceptors: {
    request: AxiosInterceptorManager<AxiosInterceptorConfig>;
    response: AxiosInterceptorManager<AxiosResponse>;
  };
}

function instrumentAxios<T extends AxiosInstance>(axiosInstance: T): T {
  axiosInstance.interceptors.request.use((config: AxiosInterceptorConfig) => {
    const traceHeaders = getTraceHeaders();
    config.headers = {
      ...config.headers,
      ...traceHeaders,
    };
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: unknown) => {
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}
