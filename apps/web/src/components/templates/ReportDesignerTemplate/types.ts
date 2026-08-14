import i18n from '@/i18n';
export type DataSourceType = 'database' | 'api' | 'excel';

export type LayoutType = 'table' | 'chart' | 'card';

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'is_null';

export type SortDirection = 'asc' | 'desc';

export interface DataSourceField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  label: string;
  options?: { label: string; value: string }[];
}

export interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  tableName?: string;
  apiUrl?: string;
  apiMethod?: 'GET' | 'POST';
  apiParams?: Record<string, unknown>;
  file?: File;
  fields: DataSourceField[];
}

export interface SelectedField {
  fieldId: string;
  fieldName: string;
  label: string;
  type: DataSourceField['type'];
  width?: number;
  visible: boolean;
  sortable: boolean;
}

export interface FilterCondition {
  id: string;
  fieldId: string;
  fieldName: string;
  operator: FilterOperator;
  value: string | number | boolean | null;
  value2?: string | number | null;
}

export interface GroupByConfig {
  fieldId: string;
  fieldName: string;
  aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface ReportChartConfig {
  type: ChartType;
  xAxisField: string;
  yAxisFields: string[];
  showLegend: boolean;
  showGrid: boolean;
  animated: boolean;
}

export interface LayoutConfig {
  type: LayoutType;
  columns: number;
  chart?: ReportChartConfig;
  showHeader: boolean;
  showFooter: boolean;
  pagination: boolean;
  pageSize: number;
}

export interface ReportDesignerTemplateProps {
  title?: string;
  subtitle?: string;
  initialDataSource?: DataSourceConfig;
  onSave?: (config: ReportDesignerState) => void;
  onExport?: (format: 'excel' | 'pdf' | 'csv') => void;
  onPreview?: (config: ReportDesignerState) => void;
  loading?: boolean;
  availableTables?: { name: string; label: string }[];
  availableApis?: { name: string; label: string; url: string }[];
}

export interface ReportDesignerState {
  dataSource: DataSourceConfig;
  selectedFields: SelectedField[];
  filters: FilterCondition[];
  groupBy: GroupByConfig[];
  sortBy: { fieldId: string; direction: SortDirection }[];
  layout: LayoutConfig;
  title: string;
  description: string;
}

export const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: i18n.t('components.types.k0') },
  { value: 'not_equals', label: i18n.t('components.types.k1') },
  { value: 'contains', label: i18n.t('components.types.k2') },
  { value: 'not_contains', label: i18n.t('components.types.k3') },
  { value: 'greater_than', label: i18n.t('components.types.k4') },
  { value: 'less_than', label: i18n.t('components.types.k5') },
  { value: 'between', label: i18n.t('components.types.k6') },
  { value: 'in', label: i18n.t('components.types.k0') },
  { value: 'is_null', label: i18n.t('components.types.k7') },
];

export const AGGREGATE_OPTIONS: { value: GroupByConfig['aggregate']; label: string }[] = [
  { value: 'count', label: i18n.t('components.types.k8') },
  { value: 'sum', label: i18n.t('components.types.k9') },
  { value: 'avg', label: i18n.t('components.types.k10') },
  { value: 'min', label: i18n.t('components.types.k11') },
  { value: 'max', label: i18n.t('components.types.k12') },
];
