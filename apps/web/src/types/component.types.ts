import type { AxiosInstance } from "axios";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "password"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "switch"
  | "date"
  | "datetime"
  | "file"
  | "hidden";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "in"
  | "not_in"
  | "is_empty"
  | "is_not_empty"
  | "between"
  | "before"
  | "after";

export type FilterFieldType = "text" | "number" | "date" | "select" | "boolean";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (
    value: unknown,
    allValues?: Record<string, unknown>,
  ) => boolean | string;
  message?: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number | boolean }>;
  validation?: ValidationRule;
  disabled?: boolean;
  hidden?: boolean;
  helpText?: string;
  colSpan?: 1 | 2 | 3 | 4;
  render?: (
    value: unknown,
    onChange: (value: unknown) => void,
    formData: Record<string, unknown>,
  ) => React.ReactNode;
  condition?: (formData: Record<string, unknown>) => boolean;
}

export interface FormBuilderProps {
  fields: FieldConfig[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
  layout?: "vertical" | "horizontal";
  showReset?: boolean;
}

export interface FilterFieldConfig {
  key: string;
  label: string;
  type: FilterFieldType;
  operators?: FilterOperator[];
  options?: Array<{ label: string; value: string | number }>;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
  value2?: unknown;
}

export interface FilterPanelProps {
  fields: FilterFieldConfig[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  savedFilters?: Array<{
    id: string;
    name: string;
    conditions: FilterCondition[];
  }>;
  onSaveFilter?: (name: string, conditions: FilterCondition[]) => void;
  onDeleteFilter?: (id: string) => void;
  logic?: "AND" | "OR";
  onLogicChange?: (logic: "AND" | "OR") => void;
  className?: string;
}

export interface DataTableColumn<TData = unknown, TValue = unknown> {
  id: string;
  header: string;
  accessorKey?: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  cell?: (info: { row: TData; getValue: () => TValue }) => React.ReactNode;
}

export interface ExportConfig<TData = unknown> {
  enabled: boolean;
  formats?: Array<"csv" | "xlsx" | "json">;
  filename?: string;
  customExporter?: (data: TData[]) => void;
}

export interface DataTableProps<
  TData extends { id?: string | number } = Record<string, unknown>,
> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  loading?: boolean;
  totalItems?: number;
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  onSearch?: (query: string) => void;
  filterable?: boolean;
  filterFields?: FilterFieldConfig[];
  onFilter?: (conditions: FilterCondition[]) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  sortable?: boolean;
  onSort?: (sorting: Array<{ id: string; desc: boolean }>) => void;
  exportConfig?: ExportConfig;
  onRowClick?: (row: TData) => void;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: TData) => void;
    variant?: "default" | "destructive" | "outline" | "ghost";
    condition?: (row: TData) => boolean;
  }>;
  batchActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (rows: TData[]) => void;
    variant?: "default" | "destructive" | "outline" | "ghost";
  }>;
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export interface PaginationProps {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showTotal?: boolean;
  className?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  loading?: boolean;
  children?: React.ReactNode;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

export interface ToastNotificationProps {
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  maxToasts?: number;
  defaultDuration?: number;
}

export interface CrudConfig<
  T extends { id?: string | number } = Record<string, unknown>,
> {
  resourceName: string;
  resourceLabel: string;
  apiClient:
    | AxiosInstance
    | {
        list: (params: Record<string, unknown>) => Promise<{
          items: T[];
          total: number;
          page: number;
          pageSize: number;
        }>;
        get: (id: string | number) => Promise<T>;
        create: (data: Partial<T>) => Promise<T>;
        update: (id: string | number, data: Partial<T>) => Promise<T>;
        delete: (id: string | number) => Promise<void>;
        batchDelete?: (ids: Array<string | number>) => Promise<void>;
      };
  listColumns: DataTableColumn<T>[];
  formFields: FieldConfig[];
  detailFields?: Array<{
    key: string;
    label: string;
    render?: (value: unknown, item: T) => React.ReactNode;
  }>;
  searchFields?: string[];
  filterFields?: FilterFieldConfig[];
  enableCreate?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  enableBatchDelete?: boolean;
  enableDetail?: boolean;
  enableSearch?: boolean;
  enableFilter?: boolean;
  enableExport?: boolean;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onItemCreated?: (item: T) => void;
  onItemUpdated?: (item: T) => void;
  onItemDeleted?: (item: T) => void;
  customActions?: DataTableProps<T>["actions"];
  customBatchActions?: DataTableProps<T>["batchActions"];
  transformFormData?: (data: Record<string, unknown>) => Partial<T>;
  transformApiData?: (data: T) => Record<string, unknown>;
}

export interface CrudPageProps<
  T extends { id?: string | number } = Record<string, unknown>,
> {
  config: CrudConfig<T>;
  className?: string;
}

export interface UseCrudOptions<T> {
  initialPageSize?: number;
  initialPage?: number;
  autoFetch?: boolean;
  transformListItem?: (item: T) => T;
  onError?: (error: unknown) => void;
  onSuccess?: (
    operation: "list" | "get" | "create" | "update" | "delete",
    data?: unknown,
  ) => void;
}

export interface UseCrudResult<T extends { id?: string | number }> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  searchQuery: string;
  filters: FilterCondition[];
  sorting: Array<{ id: string; desc: boolean }>;
  selectedItems: T[];
  fetchList: (params?: Record<string, unknown>) => Promise<void>;
  fetchDetail: (id: string | number) => Promise<T | null>;
  createItem: (data: Partial<T>) => Promise<T | null>;
  updateItem: (id: string | number, data: Partial<T>) => Promise<T | null>;
  deleteItem: (id: string | number) => Promise<boolean>;
  batchDelete: (ids: Array<string | number>) => Promise<boolean>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterCondition[]) => void;
  setSorting: (sorting: Array<{ id: string; desc: boolean }>) => void;
  setSelectedItems: (items: T[]) => void;
  reset: () => void;
  refresh: () => Promise<void>;
}

export interface UseFormValidationOptions {
  initialValues?: Record<string, unknown>;
  validationRules?: Record<string, ValidationRule>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface UseFormValidationResult {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  setValue: (field: string, value: unknown) => void;
  setValues: (values: Record<string, unknown>) => void;
  handleBlur: (field: string) => void;
  validateField: (field: string) => string | null;
  validateAll: () => boolean;
  reset: () => void;
  clearErrors: () => void;
  getFieldError: (field: string) => string | undefined;
  hasError: (field: string) => boolean;
}
