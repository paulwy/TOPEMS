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

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  report_id?: string;
  widget_type: string;
  title?: string;
  position: any;
  config?: any;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
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
