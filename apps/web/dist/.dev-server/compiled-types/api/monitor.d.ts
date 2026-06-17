import type { ApiResponse } from "./client";
export interface SystemMetrics {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_in: number;
    network_out: number;
    uptime: number;
    timestamp: string;
}
export interface ServiceHealth {
    service_name: string;
    status: "healthy" | "degraded" | "unhealthy";
    latency: number;
    error_rate: number;
    last_checked: string;
    uptime_percentage: number;
}
export interface ApiPerformance {
    endpoint: string;
    method: string;
    avg_response_time: number;
    p95_response_time: number;
    p99_response_time: number;
    request_count: number;
    error_count: number;
    error_rate: number;
    throughput: number;
}
export interface DatabaseMetrics {
    connections: number;
    max_connections: number;
    query_count: number;
    slow_query_count: number;
    avg_query_time: number;
    cache_hit_rate: number;
}
export interface Alert {
    id: string;
    alert_type: string;
    severity: "critical" | "warning" | "info";
    title: string;
    message: string;
    service_name: string;
    status: "active" | "resolved" | "acknowledged";
    created_at: string;
    resolved_at?: string;
    acknowledged_at?: string;
}
export interface AlertQueryParams {
    page?: number;
    page_size?: number;
    severity?: string;
    status?: string;
    service_name?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export interface PerformanceReport {
    period: string;
    period_type: "hourly" | "daily" | "weekly";
    metrics: {
        avg_cpu: number;
        avg_memory: number;
        avg_latency: number;
        total_requests: number;
        total_errors: number;
        uptime: number;
    };
    services: ServiceHealth[];
    top_endpoints: ApiPerformance[];
    alerts: Alert[];
    generated_at: string;
}
export declare const monitorApi: {
    getSystemMetrics: () => Promise<ApiResponse<SystemMetrics>>;
    getServiceHealth: () => Promise<ApiResponse<ServiceHealth[]>>;
    getApiPerformance: () => Promise<ApiResponse<ApiPerformance[]>>;
    getDatabaseMetrics: () => Promise<ApiResponse<DatabaseMetrics>>;
    listAlerts: (params?: AlertQueryParams) => Promise<ApiResponse<PaginatedResponse<Alert>>>;
    getAlert: (id: string) => Promise<ApiResponse<Alert>>;
    acknowledgeAlert: (id: string) => Promise<ApiResponse<Alert>>;
    resolveAlert: (id: string) => Promise<ApiResponse<Alert>>;
    getPerformanceReport: (periodType?: "hourly" | "daily" | "weekly", period?: string) => Promise<ApiResponse<PerformanceReport>>;
    getRealtimeMetrics: () => Promise<ApiResponse<SystemMetrics>>;
    health: () => Promise<ApiResponse<string>>;
};
