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
  apiParams?: Record<string, any>;
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
  { value: 'equals', label: '等于' },
  { value: 'not_equals', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'greater_than', label: '大于' },
  { value: 'less_than', label: '小于' },
  { value: 'between', label: '介于' },
  { value: 'in', label: '在...中' },
  { value: 'is_null', label: '为空' },
];

export const AGGREGATE_OPTIONS: { value: GroupByConfig['aggregate']; label: string }[] = [
  { value: 'count', label: '计数' },
  { value: 'sum', label: '求和' },
  { value: 'avg', label: '平均值' },
  { value: 'min', label: '最小值' },
  { value: 'max', label: '最大值' },
];
