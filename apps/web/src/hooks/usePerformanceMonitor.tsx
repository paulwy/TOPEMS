import React, { useEffect, useRef, useState } from "react";

interface PerformanceMetrics {
  pageLoadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  domContentLoaded: number;
  resourceLoadTimes: Record<string, number>;
  apiCallTimes: Record<string, number>;
}

interface ApiCallMetrics {
  endpoint: string;
  duration: number;
  status: "success" | "error";
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    domContentLoaded: 0,
    resourceLoadTimes: {},
    apiCallTimes: {},
  };

  private apiCalls: ApiCallMetrics[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.initPerformanceObservers();
    }
  }

  private initPerformanceObservers() {
    // 监控页面加载时间
    window.addEventListener("load", () => {
      const perfData = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      if (perfData) {
        this.metrics.pageLoadTime = perfData.loadEventEnd - perfData.startTime;
        this.metrics.domContentLoaded =
          perfData.domContentLoadedEventEnd - perfData.startTime;
      }
    });

    // 监控 FP (First Paint)
    const fpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-paint") {
          this.metrics.firstPaint = entry.startTime;
        }
      }
    });

    try {
      fpObserver.observe({ type: "paint", buffered: true });
    } catch (e) {
      console.warn("FP observer not supported");
    }

    // 监控 FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
      }
    });

    try {
      fcpObserver.observe({ type: "paint", buffered: true });
    } catch (e) {
      console.warn("FCP observer not supported");
    }

    // 监控资源加载时间
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        this.metrics.resourceLoadTimes[resource.name] =
          resource.responseEnd - resource.startTime;
      }
    });

    try {
      resourceObserver.observe({ type: "resource", buffered: true });
    } catch (e) {
      console.warn("Resource observer not supported");
    }
  }

  // 记录 API 调用时间
  recordApiCall(
    endpoint: string,
    duration: number,
    status: "success" | "error",
  ) {
    const metric: ApiCallMetrics = {
      endpoint,
      duration,
      status,
      timestamp: Date.now(),
    };

    this.apiCalls.push(metric);
    this.metrics.apiCallTimes[endpoint] = duration;

    // 保留最近 100 次调用记录
    if (this.apiCalls.length > 100) {
      this.apiCalls.shift();
    }
  }

  // 获取所有指标
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // 获取 API 调用历史
  getApiCallHistory(): ApiCallMetrics[] {
    return [...this.apiCalls];
  }

  // 获取平均 API 响应时间
  getAverageApiResponseTime(endpoint?: string): number {
    if (endpoint) {
      const calls = this.apiCalls.filter((c) => c.endpoint === endpoint);
      if (calls.length === 0) return 0;
      return calls.reduce((sum, c) => sum + c.duration, 0) / calls.length;
    }

    if (this.apiCalls.length === 0) return 0;
    return (
      this.apiCalls.reduce((sum, c) => sum + c.duration, 0) /
      this.apiCalls.length
    );
  }

  // 获取 API 成功率
  getApiSuccessRate(): number {
    if (this.apiCalls.length === 0) return 100;
    const successCalls = this.apiCalls.filter(
      (c) => c.status === "success",
    ).length;
    return (successCalls / this.apiCalls.length) * 100;
  }

  // 获取慢 API 调用（超过阈值）
  getSlowApiCalls(thresholdMs: number = 1000): ApiCallMetrics[] {
    return this.apiCalls.filter((c) => c.duration > thresholdMs);
  }

  // 清除所有记录
  clear() {
    this.apiCalls = [];
    this.metrics.apiCallTimes = {};
    this.metrics.resourceLoadTimes = {};
  }

  // 导出性能报告
  exportReport(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        apiCalls: this.apiCalls,
        summary: {
          averageApiResponseTime: this.getAverageApiResponseTime(),
          apiSuccessRate: this.getApiSuccessRate(),
          slowApiCalls: this.getSlowApiCalls().length,
        },
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }
}

// 创建全局单例
export const performanceMonitor = new PerformanceMonitor();

// React Hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(
    performanceMonitor.getMetrics(),
  );

  useEffect(() => {
    // 定期更新指标
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    recordApiCall: performanceMonitor.recordApiCall.bind(performanceMonitor),
    getApiCallHistory:
      performanceMonitor.getApiCallHistory.bind(performanceMonitor),
    getAverageApiResponseTime:
      performanceMonitor.getAverageApiResponseTime.bind(performanceMonitor),
    getApiSuccessRate:
      performanceMonitor.getApiSuccessRate.bind(performanceMonitor),
    getSlowApiCalls:
      performanceMonitor.getSlowApiCalls.bind(performanceMonitor),
    exportReport: performanceMonitor.exportReport.bind(performanceMonitor),
    clear: performanceMonitor.clear.bind(performanceMonitor),
  };
}

// API 调用包装器
export async function measureApiCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>,
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    performanceMonitor.recordApiCall(endpoint, duration, "success");

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    performanceMonitor.recordApiCall(endpoint, duration, "error");

    throw error;
  }
}

// React Hook: API 调用
export function useApiCall<T, A extends any[] = any[]>(
  apiCall: (...args: A) => Promise<T>,
  _deps: React.DependencyList = [],
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const callApi = useRef(apiCall);

  useEffect(() => {
    callApi.current = apiCall;
  }, [apiCall]);

  const execute = async (...args: A) => {
    setLoading(true);
    setError(null);

    try {
      const result = await measureApiCall(callApi.current.name, () =>
        callApi.current(...args),
      );
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, execute };
}

// 性能警告组件
export function PerformanceWarnings() {
  const { getSlowApiCalls, getApiSuccessRate } = usePerformanceMonitor();

  const slowCalls = getSlowApiCalls();
  const successRate = getApiSuccessRate();

  if (slowCalls.length === 0 && successRate >= 95) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md shadow-lg">
      <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 性能警告</h3>

      {successRate < 95 && (
        <div className="text-sm text-yellow-700 mb-2">
          API 成功率: {successRate.toFixed(1)}%
        </div>
      )}

      {slowCalls.length > 0 && (
        <div className="text-sm text-yellow-700">
          <div className="font-medium mb-1">
            慢 API 调用 ({slowCalls.length}):
          </div>
          <ul className="list-disc list-inside">
            {slowCalls.slice(0, 3).map((call, idx) => (
              <li key={idx}>
                {call.endpoint}: {(call.duration / 1000).toFixed(2)}s
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default performanceMonitor;
