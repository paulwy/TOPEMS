import React from "react";
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
declare class PerformanceMonitor {
    private metrics;
    private apiCalls;
    constructor();
    private initPerformanceObservers;
    recordApiCall(endpoint: string, duration: number, status: "success" | "error"): void;
    getMetrics(): PerformanceMetrics;
    getApiCallHistory(): ApiCallMetrics[];
    getAverageApiResponseTime(endpoint?: string): number;
    getApiSuccessRate(): number;
    getSlowApiCalls(thresholdMs?: number): ApiCallMetrics[];
    clear(): void;
    exportReport(): string;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare function usePerformanceMonitor(): {
    metrics: PerformanceMetrics;
    recordApiCall: (endpoint: string, duration: number, status: "success" | "error") => void;
    getApiCallHistory: () => ApiCallMetrics[];
    getAverageApiResponseTime: (endpoint?: string) => number;
    getApiSuccessRate: () => number;
    getSlowApiCalls: (thresholdMs?: number) => ApiCallMetrics[];
    exportReport: () => string;
    clear: () => void;
};
export declare function measureApiCall<T>(endpoint: string, apiCall: () => Promise<T>): Promise<T>;
export declare function useApiCall<T, A extends any[] = any[]>(apiCall: (...args: A) => Promise<T>, _deps?: React.DependencyList): {
    loading: boolean;
    error: Error | null;
    data: T | null;
    execute: (...args: A) => Promise<T>;
};
export declare function PerformanceWarnings(): React.JSX.Element | null;
export default performanceMonitor;
