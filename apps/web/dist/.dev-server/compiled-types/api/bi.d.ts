export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    layout?: any;
    created_by?: string;
    created_at: string;
    updated_at: string;
}
export interface Report {
    id: string;
    name: string;
    description?: string;
    report_type: string;
    config: any;
    data_source?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}
export interface KeyMetric {
    title: string;
    value: number;
    unit: string;
    change: number;
    change_type: "increase" | "decrease";
    icon: string;
}
export interface RecentActivity {
    id: number;
    type: string;
    title: string;
    time: string;
}
export interface SummaryDashboard {
    key_metrics: KeyMetric[];
    recent_activities: RecentActivity[];
    generated_at: string;
}
export interface DevelopmentAnalytics {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    project_status_distribution: {
        in_progress: number;
        pending_approval: number;
        completed: number;
        cancelled: number;
    };
    monthly_new_projects: Array<{
        month: string;
        count: number;
    }>;
    project_type_distribution: {
        research: number;
        development: number;
        improvement: number;
    };
    generated_at: string;
}
export interface QualityAnalytics {
    total_inspections: number;
    passed_inspections: number;
    failed_inspections: number;
    pass_rate: number;
    quality_trend: Array<{
        month: string;
        pass_rate: number;
    }>;
    defect_types: {
        material: number;
        process: number;
        equipment: number;
        other: number;
    };
    generated_at: string;
}
export interface ProductionAnalytics {
    total_production_batches: number;
    completed_batches: number;
    in_progress_batches: number;
    production_efficiency: number;
    daily_output: Array<{
        date: string;
        output: number;
    }>;
    product_line_usage: {
        line_a: number;
        line_b: number;
        line_c: number;
    };
    generated_at: string;
}
export interface LaboratoryAnalytics {
    total_samples: number;
    completed_tests: number;
    pending_tests: number;
    instrument_usage_rate: number;
    test_type_distribution: {
        chemical: number;
        physical: number;
        microbiological: number;
        other: number;
    };
    turnaround_time: {
        avg_hours: number;
        max_hours: number;
        min_hours: number;
    };
    generated_at: string;
}
export interface ModuleAnalytics {
    rs?: any;
    lims?: any;
    qms?: any;
    ehs?: any;
    srm?: any;
    pdm?: any;
    [key: string]: any;
}
export declare function fetchDashboards(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchDashboard(id: string): Promise<import("./client").ApiResponse<any>>;
export declare function createDashboard(data: Partial<Dashboard>): Promise<import("./client").ApiResponse<any>>;
export declare function updateDashboard(id: string, data: Partial<Dashboard>): Promise<import("./client").ApiResponse<any>>;
export declare function deleteDashboard(id: string): Promise<import("./client").ApiResponse<any>>;
export declare function fetchReports(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchReport(id: string): Promise<import("./client").ApiResponse<any>>;
export declare function createReport(data: Partial<Report>): Promise<import("./client").ApiResponse<any>>;
export declare function updateReport(id: string, data: Partial<Report>): Promise<import("./client").ApiResponse<any>>;
export declare function deleteReport(id: string): Promise<import("./client").ApiResponse<any>>;
export declare function fetchSummaryDashboard(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchDevelopmentAnalytics(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchQualityAnalytics(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchProductionAnalytics(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchLaboratoryAnalytics(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchAnalyticsOverview(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchModuleAnalytics(moduleId: string): Promise<import("./client").ApiResponse<any>>;
export declare function fetchModuleData(moduleId: string): Promise<import("./client").ApiResponse<any>>;
export declare function fetchRsSummary(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchRsProjectTimeline(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchRsExperimentSuccessRate(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchRsMaterialUsage(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchRsProjectRanking(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchLimsSummary(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchLimsSampleTimeline(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchLimsTestPassRate(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchLimsInstrumentUsage(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchLimsSampleStatusDistribution(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchQmsSummary(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchQmsQualityTrend(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchQmsIssueDistribution(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchEhsSummary(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchEhsRiskDistribution(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchEhsIncidentTrend(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchSrmSummary(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchSrmSupplierRanking(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchSrmOrderTimeline(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchPdmSummary(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchPdmProductionTrend(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchPdmBatchStatusDistribution(): Promise<import("./client").ApiResponse<any>>;
export declare function fetchModuleDetailData(moduleId: string): Promise<import("./client").ApiResponse<any>>;
declare const _default: Omit<import("axios").AxiosInstance, "get" | "post" | "put" | "patch" | "delete"> & {
    get<T = any, R = import("./client").ApiResponse<T>, D = any>(url: string, config?: import("axios").AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = import("./client").ApiResponse<T>, D = any>(url: string, data?: D, config?: import("axios").AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = import("./client").ApiResponse<T>, D = any>(url: string, data?: D, config?: import("axios").AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = import("./client").ApiResponse<T>, D = any>(url: string, data?: D, config?: import("axios").AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = import("./client").ApiResponse<T>, D = any>(url: string, config?: import("axios").AxiosRequestConfig<D>): Promise<R>;
};
export default _default;
