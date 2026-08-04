import { logger } from './logger';
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import type { Tracer, Span } from '@opentelemetry/api';
import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api';

interface TelemetryConfig {
  serviceName: string;
  otelEnabled: boolean;
  exporterType: 'otlp' | 'console';
  otlpEndpoint: string;
  samplingRate: number;
  performanceMonitorEnabled: boolean;
  errorCaptureEnabled: boolean;
}

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { env?: Record<string, string | undefined> }).env
  ) {
    return (window as unknown as { env: Record<string, string | undefined> }).env[key];
  }
  return undefined;
};

const defaultConfig: TelemetryConfig = {
  serviceName: 'topems-web',
  otelEnabled:
    getEnv('NEXT_PUBLIC_OTEL_ENABLED') === 'true' ||
    getEnv('REACT_APP_OTEL_ENABLED') === 'true' ||
    getEnv('OTEL_ENABLED') === 'true',
  exporterType:
    ((getEnv('NEXT_PUBLIC_OTEL_EXPORTER') ||
      getEnv('REACT_APP_OTEL_EXPORTER') ||
      getEnv('OTEL_EXPORTER')) as 'otlp' | 'console') || 'console',
  otlpEndpoint:
    getEnv('NEXT_PUBLIC_OTEL_ENDPOINT') ||
    getEnv('REACT_APP_OTEL_ENDPOINT') ||
    getEnv('OTEL_EXPORTER_OTLP_ENDPOINT') ||
    'http://localhost:4317',
  samplingRate: parseFloat(
    getEnv('NEXT_PUBLIC_OTEL_SAMPLING_RATE') ||
      getEnv('REACT_APP_OTEL_SAMPLING_RATE') ||
      getEnv('OTEL_TRACES_SAMPLER_ARG') ||
      '1.0'
  ),
  performanceMonitorEnabled: true,
  errorCaptureEnabled: true,
};

let tracer: Tracer | null = null;

export function initTelemetry(config: Partial<TelemetryConfig> = {}) {
  const finalConfig: TelemetryConfig = { ...defaultConfig, ...config };

  if (!finalConfig.otelEnabled) {
    logger.info('[Telemetry] OpenTelemetry is disabled');
    return;
  }

  const spanProcessors: any[] = [];

  if (finalConfig.exporterType === 'console') {
    spanProcessors.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
  }

  if (finalConfig.exporterType === 'otlp') {
    try {
      spanProcessors.push(
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: `${finalConfig.otlpEndpoint}/v1/traces`,
          })
        )
      );
    } catch (e) {
      logger.error('[Telemetry] Failed to create OTLP exporter:', e);
    }
  }

  const provider = new WebTracerProvider({ spanProcessors });

  const isDevelopment = process.env.NODE_ENV === 'development';

  provider.register({
    contextManager: isDevelopment ? undefined : new ZoneContextManager(),
    propagator: new B3Propagator(),
  });

  propagation.setGlobalPropagator(new B3Propagator());

  const instrumentations: Instrumentation[] = [
    new XMLHttpRequestInstrumentation({
      ignoreUrls: [/\/health/, /\/metrics/],
      propagateTraceHeaderCorsUrls: [/^http:\/\/localhost:/, /^https?:\/\//],
    }),
    new FetchInstrumentation({
      ignoreUrls: [/\/health/, /\/metrics/],
      propagateTraceHeaderCorsUrls: [/^http:\/\/localhost:/, /^https?:\/\//],
    }),
  ];

  registerInstrumentations({ instrumentations });

  tracer = trace.getTracer(finalConfig.serviceName);

  logger.info(
    `[Telemetry] OpenTelemetry initialized (exporter: ${finalConfig.exporterType}, endpoint: ${finalConfig.otlpEndpoint})`
  );

  if (finalConfig.performanceMonitorEnabled) {
    initPerformanceMonitoring();
  }

  if (finalConfig.errorCaptureEnabled) {
    initErrorCapture();
  }
}

function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recordPerformanceEntry(entry);
      }
    });

    observer.observe({
      entryTypes: ['navigation', 'resource', 'mark', 'measure'],
    });

    window.addEventListener('load', () => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        recordNavigationPerformance(navEntry as PerformanceNavigationTiming);
      }
    });
  }
}

function recordPerformanceEntry(entry: PerformanceEntry) {
  const span = startSpan(`performance:${entry.entryType}`, {
    entryType: entry.entryType,
    name: entry.name,
    duration: entry.duration,
    startTime: entry.startTime,
  });

  if (entry.entryType === 'resource') {
    const resourceEntry = entry as PerformanceResourceTiming;
    span.setAttribute('initiatorType', resourceEntry.initiatorType);
    span.setAttribute('responseStatus', resourceEntry.responseStatus);
    span.setAttribute('transferSize', resourceEntry.transferSize);
    span.setAttribute('decodedBodySize', resourceEntry.decodedBodySize);
  }

  endSpan(span);
}

function recordNavigationPerformance(entry: PerformanceNavigationTiming) {
  const span = startSpan('navigation_performance', {
    duration: entry.duration,
    redirectCount: entry.redirectCount,
    unloadEventEnd: entry.unloadEventEnd,
    domInteractive: entry.domInteractive,
    domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
    loadEventEnd: entry.loadEventEnd,
    serverTiming: JSON.stringify(entry.serverTiming),
  });
  endSpan(span);
}

function initErrorCapture() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event: ErrorEvent) => {
      const span = startSpan('error:uncaught', {
        errorName: event.error?.name || 'Error',
        errorMessage: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });

      if (event.error) {
        span.recordException(event.error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
      }

      endSpan(span);
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const span = startSpan('error:unhandled_rejection', {
        reason:
          typeof event.reason === 'string' ? event.reason : event.reason?.message || 'Unknown',
      });

      if (event.reason instanceof Error) {
        span.recordException(event.reason);
        span.setStatus({ code: SpanStatusCode.ERROR, message: event.reason.message });
      }

      endSpan(span);
    });
  }
}

export function getTracer(): Tracer {
  if (!tracer) {
    tracer = trace.getTracer('topems-web');
  }
  return tracer;
}

export function startSpan(name: string, attributes?: Record<string, unknown>): Span {
  const span = getTracer().startSpan(name);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        span.setAttribute(key, value as string | number | boolean);
      }
    });
  }

  context.with(trace.setSpan(context.active(), span), () => {});

  return span;
}

export function endSpan(span: Span, error?: Error): void {
  if (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
  span.end();
}

export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const span = startSpan(name, attributes);

  try {
    const result = await fn();
    endSpan(span);
    return result;
  } catch (error) {
    endSpan(span, error as Error);
    throw error;
  }
}

export function traceSync<T>(name: string, fn: () => T, attributes?: Record<string, unknown>): T {
  const span = startSpan(name, attributes);

  try {
    const result = fn();
    endSpan(span);
    return result;
  } catch (error) {
    endSpan(span, error as Error);
    throw error;
  }
}

export function injectTraceContext(): Record<string, string> {
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
  });
  return headers;
}

export interface PerformanceMetrics {
  navigationDuration: number;
  domInteractive: number;
  domContentLoaded: number;
  loadTime: number;
  firstContentfulPaint: number;
}

export function getPerformanceMetrics(): PerformanceMetrics | null {
  if (typeof window === 'undefined') return null;

  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navEntry) return null;

  return {
    navigationDuration: navEntry.duration,
    domInteractive: navEntry.domInteractive,
    domContentLoaded: navEntry.domContentLoadedEventEnd,
    loadTime: navEntry.loadEventEnd,
    firstContentfulPaint:
      (navEntry as unknown as { firstContentfulPaint?: number }).firstContentfulPaint || 0,
  };
}

export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    logger.info(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

export async function measurePerformanceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.info(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}
