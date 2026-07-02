import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startTrace,
  getCurrentTraceId,
  getCurrentSpanId,
  createSpan,
  endSpan,
  getTraceHeaders,
  instrumentFetch,
  instrumentAxios,
  resetTrace,
} from '../tracing';

vi.mock('../../config/runtime', () => ({
  default: {
    features: {
      debugMode: true,
    },
    services: {
      jaeger: 'http://localhost:14268',
    },
  },
}));

describe('Tracing Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    resetTrace();
  });

  describe('startTrace', () => {
    it('should generate a trace context with valid traceId and spanId', () => {
      const context = startTrace();
      expect(context.traceId).toBeDefined();
      expect(context.traceId.length).toBe(32);
      expect(context.spanId).toBeDefined();
      expect(context.spanId.length).toBe(16);
      expect(context.traceFlags).toBe(1);
    });

    it('should set current trace and span IDs', () => {
      const context = startTrace();
      expect(getCurrentTraceId()).toBe(context.traceId);
      expect(getCurrentSpanId()).toBe(context.spanId);
    });
  });

  describe('createSpan', () => {
    it('should create a span with valid span context', () => {
      startTrace();
      const span = createSpan('test-operation');
      expect(span.name).toBe('test-operation');
      expect(span.startTime).toBeDefined();
      expect(span.spanContext.traceId).toBeDefined();
      expect(span.spanContext.spanId).toBeDefined();
    });

    it('should create span with parent span reference', () => {
      startTrace();
      const parentSpan = createSpan('parent-operation');
      const childSpan = createSpan('child-operation', parentSpan.spanContext.spanId);
      expect(childSpan.parentSpanId).toBe(parentSpan.spanContext.spanId);
    });
  });

  describe('endSpan', () => {
    it('should set endTime on span', () => {
      startTrace();
      const span = createSpan('test-operation');
      endSpan(span);
      expect(span.endTime).toBeDefined();
      expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
    });

    it('should add attributes to span', () => {
      startTrace();
      const span = createSpan('test-operation');
      endSpan(span, { status: 200, url: '/api/test' });
      expect(span.attributes).toEqual({ status: 200, url: '/api/test' });
    });
  });

  describe('getTraceHeaders', () => {
    it('should return empty headers when no trace is active', () => {
      const headers = getTraceHeaders();
      expect(headers).toEqual({});
    });

    it('should return trace headers when trace is active', () => {
      const context = startTrace();
      const headers = getTraceHeaders();
      expect(headers['traceparent']).toBe(`00-${context.traceId}-${context.spanId}-01`);
      expect(headers['x-request-id']).toBe(context.traceId);
    });
  });

  describe('instrumentFetch', () => {
    it('should return a function that wraps fetch', () => {
      const tracedFetch = instrumentFetch(fetch);
      expect(typeof tracedFetch).toBe('function');
    });
  });

  describe('instrumentAxios', () => {
    it('should add interceptors to axios instance', () => {
      const mockInterceptors = {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      };
      const mockAxios = { interceptors: mockInterceptors };
      const result = instrumentAxios(mockAxios);
      expect(mockInterceptors.request.use).toHaveBeenCalled();
      expect(mockInterceptors.response.use).toHaveBeenCalled();
      expect(result).toBe(mockAxios);
    });
  });
});
