export interface DashboardLayout {
  [key: string]: unknown;
}

export interface WidgetConfig {
  [key: string]: unknown;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReportConfig {
  [key: string]: unknown;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout?: DashboardLayout;
  owner_id?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  preview_image?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: string;
  dashboard_id?: string;
  name: string;
  widget_type: string;
  config?: WidgetConfig;
  position?: WidgetPosition;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  config: ReportConfig;
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
  change_type: 'increase' | 'decrease';
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
  monthly_new_projects: Array<{ month: string; count: number }>;
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
  quality_trend: Array<{ month: string; pass_rate: number }>;
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
  daily_output: Array<{ date: string; output: number }>;
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

export interface ModuleAnalyticsData {
  [key: string]: unknown;
}

export interface ModuleAnalytics {
  rs?: ModuleAnalyticsData;
  lims?: ModuleAnalyticsData;
  qms?: ModuleAnalyticsData;
  ehs?: ModuleAnalyticsData;
  srm?: ModuleAnalyticsData;
  pdm?: ModuleAnalyticsData;
  [key: string]: ModuleAnalyticsData | undefined;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  host: string;
  database: string;
  port?: number;
  username?: string;
  connection_string?: string;
  last_sync?: string;
  data_volume?: number;
  sync_frequency?: string;
  description?: string;
  is_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComparisonAnalysisFilters {
  [key: string]: string | number | boolean | undefined;
}

export interface ComparisonAnalysis {
  id: string;
  name: string;
  description?: string;
  comparison_type: string;
  dimension_a: string;
  dimension_b: string;
  indicators: string[];
  filters?: ComparisonAnalysisFilters;
  status: 'draft' | 'running' | 'completed' | 'failed';
  last_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonResultSummary {
  [key: string]: unknown;
}

export interface ComparisonResult {
  id: string;
  comparison_id: string;
  status: 'success' | 'failed';
  data: Array<{
    indicator: string;
    value_a: number;
    value_b: number;
    difference: number;
    change_rate: number;
  }>;
  summary?: ComparisonResultSummary;
  generated_at: string;
}

export interface SyncRecord {
  id: string;
  data_source_id: string;
  data_source_name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  sync_type: string;
  records_count?: number;
  affected_records?: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}
