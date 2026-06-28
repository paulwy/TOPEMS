import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  IconButton,
  _Tooltip,
  Tabs,
  Tab,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  _Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Database,
  Globe,
  FileSpreadsheet,
  Plus,
  Trash2,
  MoveVertical,
  Eye,
  Save,
  Download,
  _Settings,
  Filter,
  BarChart3,
  Table,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  _FolderOpen,
  _Wand2,
  _RefreshCw,
} from 'lucide-react';

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

const MOCK_FIELDS: Record<string, DataSourceField[]> = {
  orders: [
    { id: 'order_id', name: 'order_id', type: 'string', label: '订单编号' },
    { id: 'customer_name', name: 'customer_name', type: 'string', label: '客户名称' },
    { id: 'order_date', name: 'order_date', type: 'date', label: '订单日期' },
    { id: 'amount', name: 'amount', type: 'number', label: '订单金额' },
    {
      id: 'status',
      name: 'status',
      type: 'select',
      label: '订单状态',
      options: [
        { label: '待处理', value: 'pending' },
        { label: '已完成', value: 'completed' },
        { label: '已取消', value: 'cancelled' },
      ],
    },
    { id: 'product_name', name: 'product_name', type: 'string', label: '产品名称' },
    { id: 'quantity', name: 'quantity', type: 'number', label: '数量' },
    { id: 'discount', name: 'discount', type: 'number', label: '折扣' },
  ],
  users: [
    { id: 'user_id', name: 'user_id', type: 'string', label: '用户ID' },
    { id: 'username', name: 'username', type: 'string', label: '用户名' },
    { id: 'email', name: 'email', type: 'string', label: '邮箱' },
    { id: 'phone', name: 'phone', type: 'string', label: '手机号' },
    { id: 'department', name: 'department', type: 'string', label: '部门' },
    { id: 'position', name: 'position', type: 'string', label: '职位' },
    { id: 'created_at', name: 'created_at', type: 'date', label: '创建时间' },
    {
      id: 'status',
      name: 'status',
      type: 'select',
      label: '状态',
      options: [
        { label: '在职', value: 'active' },
        { label: '离职', value: 'inactive' },
      ],
    },
  ],
  projects: [
    { id: 'project_id', name: 'project_id', type: 'string', label: '项目编号' },
    { id: 'project_name', name: 'project_name', type: 'string', label: '项目名称' },
    { id: 'manager', name: 'manager', type: 'string', label: '项目经理' },
    { id: 'start_date', name: 'start_date', type: 'date', label: '开始日期' },
    { id: 'end_date', name: 'end_date', type: 'date', label: '结束日期' },
    { id: 'budget', name: 'budget', type: 'number', label: '预算' },
    { id: 'progress', name: 'progress', type: 'number', label: '进度(%)' },
    {
      id: 'status',
      name: 'status',
      type: 'select',
      label: '状态',
      options: [
        { label: '进行中', value: 'in_progress' },
        { label: '已完成', value: 'completed' },
        { label: '已暂停', value: 'paused' },
      ],
    },
  ],
};

const MOCK_DATA: Record<string, Record<string, any>[]> = {
  orders: [
    {
      order_id: 'ORD001',
      customer_name: '张三',
      order_date: '2024-01-15',
      amount: 12500,
      status: 'completed',
      product_name: '产品A',
      quantity: 10,
      discount: 0.1,
    },
    {
      order_id: 'ORD002',
      customer_name: '李四',
      order_date: '2024-01-16',
      amount: 8900,
      status: 'pending',
      product_name: '产品B',
      quantity: 5,
      discount: 0.05,
    },
    {
      order_id: 'ORD003',
      customer_name: '王五',
      order_date: '2024-01-17',
      amount: 15600,
      status: 'completed',
      product_name: '产品A',
      quantity: 12,
      discount: 0.15,
    },
    {
      order_id: 'ORD004',
      customer_name: '赵六',
      order_date: '2024-01-18',
      amount: 6700,
      status: 'cancelled',
      product_name: '产品C',
      quantity: 3,
      discount: 0,
    },
    {
      order_id: 'ORD005',
      customer_name: '孙七',
      order_date: '2024-01-19',
      amount: 23400,
      status: 'completed',
      product_name: '产品B',
      quantity: 15,
      discount: 0.2,
    },
  ],
  users: [
    {
      user_id: 'U001',
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      phone: '13800138001',
      department: '技术部',
      position: '工程师',
      created_at: '2023-06-01',
      status: 'active',
    },
    {
      user_id: 'U002',
      username: 'lisi',
      email: 'lisi@example.com',
      phone: '13800138002',
      department: '销售部',
      position: '销售经理',
      created_at: '2023-07-15',
      status: 'active',
    },
    {
      user_id: 'U003',
      username: 'wangwu',
      email: 'wangwu@example.com',
      phone: '13800138003',
      department: '技术部',
      position: '高级工程师',
      created_at: '2023-05-20',
      status: 'active',
    },
    {
      user_id: 'U004',
      username: 'zhaoliu',
      email: 'zhaoliu@example.com',
      phone: '13800138004',
      department: '财务部',
      position: '会计',
      created_at: '2023-08-01',
      status: 'inactive',
    },
  ],
  projects: [
    {
      project_id: 'PRJ001',
      project_name: 'ERP系统升级',
      manager: '张三',
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      budget: 500000,
      progress: 65,
      status: 'in_progress',
    },
    {
      project_id: 'PRJ002',
      project_name: '移动端APP开发',
      manager: '李四',
      start_date: '2024-02-01',
      end_date: '2024-08-31',
      budget: 800000,
      progress: 30,
      status: 'in_progress',
    },
    {
      project_id: 'PRJ003',
      project_name: '数据分析平台',
      manager: '王五',
      start_date: '2023-10-01',
      end_date: '2024-03-31',
      budget: 300000,
      progress: 100,
      status: 'completed',
    },
    {
      project_id: 'PRJ004',
      project_name: 'CRM系统实施',
      manager: '赵六',
      start_date: '2024-03-01',
      end_date: '2024-09-30',
      budget: 450000,
      progress: 15,
      status: 'paused',
    },
  ],
};

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
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

const AGGREGATE_OPTIONS: { value: GroupByConfig['aggregate']; label: string }[] = [
  { value: 'count', label: '计数' },
  { value: 'sum', label: '求和' },
  { value: 'avg', label: '平均值' },
  { value: 'min', label: '最小值' },
  { value: 'max', label: '最大值' },
];

export const ReportDesignerTemplate: React.FC<ReportDesignerTemplateProps> = ({
  title = '报表设计器',
  subtitle = '可视化设计报表，灵活配置数据源、字段和布局',
  initialDataSource,
  onSave,
  onExport,
  onPreview,
  _loading = false,
  availableTables = [
    { name: 'orders', label: '订单表' },
    { name: 'users', label: '用户表' },
    { name: 'projects', label: '项目表' },
  ],
  availableApis = [
    { name: 'sales_report', label: '销售报表API', url: '/api/reports/sales' },
    { name: 'inventory_report', label: '库存报表API', url: '/api/reports/inventory' },
    { name: 'performance_report', label: '绩效报表API', url: '/api/reports/performance' },
  ],
}) => {
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeTab, setActiveTab] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showDataSourcePanel, setShowDataSourcePanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const [state, setState] = useState<ReportDesignerState>({
    dataSource: initialDataSource || {
      type: 'database',
      name: '',
      tableName: '',
      fields: [],
    },
    selectedFields: [],
    filters: [],
    groupBy: [],
    sortBy: [],
    layout: {
      type: 'table',
      columns: 1,
      showHeader: true,
      showFooter: true,
      pagination: true,
      pageSize: 10,
      chart: {
        type: 'bar',
        xAxisField: '',
        yAxisFields: [],
        showLegend: true,
        showGrid: true,
        animated: true,
      },
    },
    title: '',
    description: '',
  });

  const availableFields = useMemo(() => {
    if (state.dataSource.type === 'database' && state.dataSource.tableName) {
      return MOCK_FIELDS[state.dataSource.tableName] || [];
    }
    return state.dataSource.fields;
  }, [state.dataSource]);

  const unselectedFields = useMemo(() => {
    const selectedIds = new Set(state.selectedFields.map((f) => f.fieldId));
    return availableFields.filter((f) => !selectedIds.has(f.id));
  }, [availableFields, state.selectedFields]);

  const previewData = useMemo(() => {
    const sourceName = state.dataSource.tableName || 'orders';
    const rawData = MOCK_DATA[sourceName] || [];
    const visibleFields = state.selectedFields.filter((f) => f.visible);

    if (visibleFields.length === 0) return rawData;

    return rawData.map((row) => {
      const newRow: Record<string, any> = {};
      visibleFields.forEach((field) => {
        newRow[field.fieldName] = row[field.fieldName];
      });
      return newRow;
    });
  }, [state.dataSource.tableName, state.selectedFields]);

  const handleDataSourceTypeChange = useCallback((type: DataSourceType) => {
    setState((prev) => ({
      ...prev,
      dataSource: {
        ...prev.dataSource,
        type,
        tableName: type === 'database' ? prev.dataSource.tableName : undefined,
        apiUrl: type === 'api' ? prev.dataSource.apiUrl : undefined,
        file: type === 'excel' ? prev.dataSource.file : undefined,
        fields: [],
      },
      selectedFields: [],
    }));
  }, []);

  const handleTableSelect = useCallback(
    (tableName: string) => {
      const fields = MOCK_FIELDS[tableName] || [];
      setState((prev) => ({
        ...prev,
        dataSource: {
          ...prev.dataSource,
          tableName,
          name: availableTables.find((t) => t.name === tableName)?.label || tableName,
          fields,
        },
        selectedFields: fields.map((f) => ({
          fieldId: f.id,
          fieldName: f.name,
          label: f.label,
          type: f.type,
          width: 150,
          visible: true,
          sortable: true,
        })),
      }));
    },
    [availableTables]
  );

  const handleApiSelect = useCallback(
    (apiName: string) => {
      const api = availableApis.find((a) => a.name === apiName);
      if (api) {
        const fields = MOCK_FIELDS['orders'] || [];
        setState((prev) => ({
          ...prev,
          dataSource: {
            ...prev.dataSource,
            apiUrl: api.url,
            name: api.label,
            apiMethod: 'GET',
            fields,
          },
          selectedFields: fields.map((f) => ({
            fieldId: f.id,
            fieldName: f.name,
            label: f.label,
            type: f.type,
            width: 150,
            visible: true,
            sortable: true,
          })),
        }));
      }
    },
    [availableApis]
  );

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fields = MOCK_FIELDS['orders'] || [];
      setState((prev) => ({
        ...prev,
        dataSource: {
          ...prev.dataSource,
          file,
          name: file.name,
          fields,
        },
        selectedFields: fields.map((f) => ({
          fieldId: f.id,
          fieldName: f.name,
          label: f.label,
          type: f.type,
          width: 150,
          visible: true,
          sortable: true,
        })),
      }));
    }
  }, []);

  const handleAddField = useCallback((field: DataSourceField) => {
    setState((prev) => ({
      ...prev,
      selectedFields: [
        ...prev.selectedFields,
        {
          fieldId: field.id,
          fieldName: field.name,
          label: field.label,
          type: field.type,
          width: 150,
          visible: true,
          sortable: true,
        },
      ],
    }));
  }, []);

  const handleRemoveField = useCallback((fieldId: string) => {
    setState((prev) => ({
      ...prev,
      selectedFields: prev.selectedFields.filter((f) => f.fieldId !== fieldId),
    }));
  }, []);

  const handleReorderFields = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newFields = [...prev.selectedFields];
      const [removed] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, removed);
      return { ...prev, selectedFields: newFields };
    });
  }, []);

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<SelectedField>) => {
    setState((prev) => ({
      ...prev,
      selectedFields: prev.selectedFields.map((f) =>
        f.fieldId === fieldId ? { ...f, ...updates } : f
      ),
    }));
  }, []);

  const handleAddFilter = useCallback(() => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      fieldId: availableFields[0]?.id || '',
      fieldName: availableFields[0]?.name || '',
      operator: 'equals',
      value: null,
    };
    setState((prev) => ({ ...prev, filters: [...prev.filters, newFilter] }));
  }, [availableFields]);

  const handleUpdateFilter = useCallback((filterId: string, updates: Partial<FilterCondition>) => {
    setState((prev) => ({
      ...prev,
      filters: prev.filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
    }));
  }, []);

  const handleRemoveFilter = useCallback((filterId: string) => {
    setState((prev) => ({ ...prev, filters: prev.filters.filter((f) => f.id !== filterId) }));
  }, []);

  const handleAddGroupBy = useCallback(() => {
    const numericFields = availableFields.filter((f) => f.type === 'number');
    const newGroup: GroupByConfig = {
      fieldId: availableFields[0]?.id || '',
      fieldName: availableFields[0]?.name || '',
      aggregate: numericFields.length > 0 ? 'sum' : undefined,
    };
    setState((prev) => ({ ...prev, groupBy: [...prev.groupBy, newGroup] }));
  }, [availableFields]);

  const handleUpdateGroupBy = useCallback((index: number, updates: Partial<GroupByConfig>) => {
    setState((prev) => {
      const newGroupBy = [...prev.groupBy];
      newGroupBy[index] = { ...newGroupBy[index], ...updates };
      return { ...prev, groupBy: newGroupBy };
    });
  }, []);

  const handleRemoveGroupBy = useCallback((index: number) => {
    setState((prev) => {
      const newGroupBy = [...prev.groupBy];
      newGroupBy.splice(index, 1);
      return { ...prev, groupBy: newGroupBy };
    });
  }, []);

  const handleLayoutChange = useCallback((type: LayoutType) => {
    setState((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        type,
        columns: type === 'card' ? 3 : type === 'chart' ? 1 : 1,
      },
    }));
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(state);
  }, [state, onSave]);

  const handleExport = useCallback(
    (format: 'excel' | 'pdf' | 'csv') => {
      onExport?.(format);
    },
    [onExport]
  );

  const handlePreview = useCallback(() => {
    onPreview?.(state);
    setPreviewOpen(true);
  }, [state, onPreview]);

  const renderDataSourcePanel = () => {
    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setShowDataSourcePanel(!showDataSourcePanel)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Database sx={{ width: 18, height: 18, color: 'primary.main' }} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              数据源
            </Typography>
          </Box>
          <IconButton size='small'>
            {showDataSourcePanel ? (
              <ChevronUp sx={{ width: 18, height: 18 }} />
            ) : (
              <ChevronDown sx={{ width: 18, height: 18 }} />
            )}
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {showDataSourcePanel && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <RadioGroup
              row
              value={state.dataSource.type}
              onChange={(e) => handleDataSourceTypeChange(e.target.value as DataSourceType)}
              sx={{ flexWrap: 'wrap', gap: 2 }}
            >
              <FormControlLabel
                value='database'
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Database sx={{ width: 16, height: 16 }} />
                    <span>数据库表</span>
                  </Box>
                }
              />
              <FormControlLabel
                value='api'
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Globe sx={{ width: 16, height: 16 }} />
                    <span>API接口</span>
                  </Box>
                }
              />
              <FormControlLabel
                value='excel'
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FileSpreadsheet sx={{ width: 16, height: 16 }} />
                    <span>Excel上传</span>
                  </Box>
                }
              />
            </RadioGroup>

            {state.dataSource.type === 'database' && (
              <FormControl fullWidth>
                <InputLabel>选择数据表</InputLabel>
                <Select
                  value={state.dataSource.tableName || ''}
                  label='选择数据表'
                  onChange={(e) => handleTableSelect(e.target.value)}
                >
                  {availableTables.map((table) => (
                    <MenuItem
                      key={table.name}
                      value={table.name}
                    >
                      {table.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {state.dataSource.type === 'api' && (
              <FormControl fullWidth>
                <InputLabel>选择API接口</InputLabel>
                <Select
                  value={state.dataSource.apiUrl || ''}
                  label='选择API接口'
                  onChange={(e) =>
                    handleApiSelect(availableApis.find((a) => a.url === e.target.value)?.name || '')
                  }
                >
                  {availableApis.map((api) => (
                    <MenuItem
                      key={api.name}
                      value={api.url}
                    >
                      {api.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {state.dataSource.type === 'excel' && (
              <Box
                sx={{
                  p: 3,
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  textAlign: 'center',
                }}
              >
                <input
                  type='file'
                  accept='.xlsx,.xls,.csv'
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id='excel-upload'
                />
                <label
                  htmlFor='excel-upload'
                  style={{ cursor: 'pointer' }}
                >
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  >
                    <FileSpreadsheet sx={{ width: 48, height: 48, color: 'grey.400' }} />
                    <Typography
                      variant='body1'
                      sx={{ color: 'grey.600' }}
                    >
                      点击上传Excel文件
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'grey.400' }}
                    >
                      支持 .xlsx, .xls, .csv 格式
                    </Typography>
                  </Box>
                </label>
              </Box>
            )}

            {state.dataSource.name && (
              <Chip
                label={`已选择: ${state.dataSource.name}`}
                color='success'
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
          </Box>
        )}
      </Box>
    );
  };

  const renderFieldSelector = () => {
    return (
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1, color: 'grey.600' }}
          >
            可用字段
          </Typography>
          <Paper sx={{ p: 1, maxHeight: 300, overflowY: 'auto', borderRadius: 1 }}>
            {unselectedFields.length === 0 ? (
              <Typography
                variant='caption'
                sx={{ p: 2, display: 'block', color: 'grey.400' }}
              >
                所有字段已添加
              </Typography>
            ) : (
              unselectedFields.map((field) => (
                <Box
                  key={field.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {field.label}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'grey.400' }}
                    >
                      {field.type}
                    </Typography>
                  </Box>
                  <IconButton
                    size='small'
                    onClick={() => handleAddField(field)}
                    sx={{ p: 0.5 }}
                  >
                    <Plus sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </IconButton>
                </Box>
              ))
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, color: 'grey.600' }}
            >
              已选字段 ({state.selectedFields.length})
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'grey.400' }}
            >
              拖拽排序
            </Typography>
          </Box>
          <Paper sx={{ p: 1, maxHeight: 300, overflowY: 'auto', borderRadius: 1 }}>
            {state.selectedFields.length === 0 ? (
              <Typography
                variant='caption'
                sx={{ p: 2, display: 'block', color: 'grey.400' }}
              >
                请从左侧添加字段
              </Typography>
            ) : (
              state.selectedFields.map((field, index) => (
                <Box
                  key={field.fieldId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: 'grey.50',
                  }}
                >
                  <IconButton
                    size='small'
                    sx={{ p: 0.5, cursor: 'move', opacity: 0.5 }}
                    onMouseDown={() => {
                      const handleDragOver = (e: DragEvent) => {
                        e.preventDefault();
                      };
                      const handleDrop = (e: DragEvent) => {
                        e.preventDefault();
                        if (e.dataTransfer) {
                          const targetIndex = parseInt(e.dataTransfer.getData('index'));
                          handleReorderFields(index, targetIndex);
                        }
                      };
                      document.addEventListener('dragover', handleDragOver);
                      document.addEventListener('drop', handleDrop);
                    }}
                  >
                    <MoveVertical sx={{ width: 14, height: 14 }} />
                  </IconButton>
                  <Checkbox
                    checked={field.visible}
                    onChange={(e) =>
                      handleFieldUpdate(field.fieldId, { visible: e.target.checked })
                    }
                    size='small'
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      size='small'
                      value={field.label}
                      onChange={(e) => handleFieldUpdate(field.fieldId, { label: e.target.value })}
                      sx={{ width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                    />
                  </Box>
                  <IconButton
                    size='small'
                    onClick={() => handleRemoveField(field.fieldId)}
                    sx={{ p: 0.5 }}
                  >
                    <Trash2 sx={{ width: 14, height: 14, color: 'error.main' }} />
                  </IconButton>
                </Box>
              ))
            )}
          </Paper>
        </Box>
      </Box>
    );
  };

  const renderFilterPanel = () => {
    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setShowFilterPanel(!showFilterPanel)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Filter sx={{ width: 18, height: 18, color: 'secondary.main' }} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              筛选条件
            </Typography>
            {state.filters.length > 0 && (
              <Chip
                size='small'
                label={state.filters.length}
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <IconButton size='small'>
            {showFilterPanel ? (
              <ChevronUp sx={{ width: 18, height: 18 }} />
            ) : (
              <ChevronDown sx={{ width: 18, height: 18 }} />
            )}
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {showFilterPanel && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {state.filters.map((filter) => (
              <Box
                key={filter.id}
                sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel size='small'>字段</InputLabel>
                  <Select
                    size='small'
                    value={filter.fieldId}
                    label='字段'
                    onChange={(e) => {
                      const field = availableFields.find((f) => f.id === e.target.value);
                      handleUpdateFilter(filter.id, {
                        fieldId: e.target.value,
                        fieldName: field?.name || '',
                      });
                    }}
                  >
                    {availableFields.map((f) => (
                      <MenuItem
                        key={f.id}
                        value={f.id}
                      >
                        {f.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel size='small'>操作符</InputLabel>
                  <Select
                    size='small'
                    value={filter.operator}
                    label='操作符'
                    onChange={(e) =>
                      handleUpdateFilter(filter.id, { operator: e.target.value as FilterOperator })
                    }
                  >
                    {FILTER_OPERATORS.map((op) => (
                      <MenuItem
                        key={op.value}
                        value={op.value}
                      >
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size='small'
                  placeholder='值'
                  value={filter.value || ''}
                  onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                  sx={{ minWidth: 150 }}
                />
                {filter.operator === 'between' && (
                  <TextField
                    size='small'
                    placeholder='至'
                    value={filter.value2 || ''}
                    onChange={(e) => handleUpdateFilter(filter.id, { value2: e.target.value })}
                    sx={{ minWidth: 100 }}
                  />
                )}
                <IconButton
                  size='small'
                  onClick={() => handleRemoveFilter(filter.id)}
                >
                  <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
                </IconButton>
              </Box>
            ))}
            <Button
              size='small'
              startIcon={<Plus sx={{ width: 14, height: 14 }} />}
              onClick={handleAddFilter}
              disabled={availableFields.length === 0}
            >
              添加筛选条件
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  const renderGroupPanel = () => {
    return (
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setShowGroupPanel(!showGroupPanel)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChart3 sx={{ width: 18, height: 18, color: 'success.main' }} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              分组设置
            </Typography>
            {state.groupBy.length > 0 && (
              <Chip
                size='small'
                label={state.groupBy.length}
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <IconButton size='small'>
            {showGroupPanel ? (
              <ChevronUp sx={{ width: 18, height: 18 }} />
            ) : (
              <ChevronDown sx={{ width: 18, height: 18 }} />
            )}
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {showGroupPanel && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {state.groupBy.map((group, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel size='small'>分组字段</InputLabel>
                  <Select
                    size='small'
                    value={group.fieldId}
                    label='分组字段'
                    onChange={(e) => {
                      const field = availableFields.find((f) => f.id === e.target.value);
                      handleUpdateGroupBy(index, {
                        fieldId: e.target.value,
                        fieldName: field?.name || '',
                      });
                    }}
                  >
                    {availableFields.map((f) => (
                      <MenuItem
                        key={f.id}
                        value={f.id}
                      >
                        {f.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel size='small'>聚合方式</InputLabel>
                  <Select
                    size='small'
                    value={group.aggregate || ''}
                    label='聚合方式'
                    onChange={(e) =>
                      handleUpdateGroupBy(index, {
                        aggregate: e.target.value as GroupByConfig['aggregate'],
                      })
                    }
                  >
                    <MenuItem value=''>无</MenuItem>
                    {AGGREGATE_OPTIONS.map((op) => (
                      <MenuItem
                        key={op.value}
                        value={op.value}
                      >
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  size='small'
                  onClick={() => handleRemoveGroupBy(index)}
                >
                  <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
                </IconButton>
              </Box>
            ))}
            <Button
              size='small'
              startIcon={<Plus sx={{ width: 14, height: 14 }} />}
              onClick={handleAddGroupBy}
              disabled={availableFields.length === 0}
            >
              添加分组
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  const renderLayoutPanel = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, color: 'grey.600' }}
        >
          布局类型
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant={state.layout.type === 'table' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutChange('table')}
            sx={{ borderRadius: 1 }}
          >
            <Table sx={{ width: 16, height: 16, mr: 1 }} />
            表格
          </Button>
          <Button
            variant={state.layout.type === 'chart' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutChange('chart')}
            sx={{ borderRadius: 1 }}
          >
            <BarChart3 sx={{ width: 16, height: 16, mr: 1 }} />
            图表
          </Button>
          <Button
            variant={state.layout.type === 'card' ? 'contained' : 'outlined'}
            onClick={() => handleLayoutChange('card')}
            sx={{ borderRadius: 1 }}
          >
            <LayoutGrid sx={{ width: 16, height: 16, mr: 1 }} />
            卡片
          </Button>
        </Box>

        {state.layout.type === 'chart' && (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 2 }}
            >
              图表配置
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl>
                <InputLabel size='small'>图表类型</InputLabel>
                <Select
                  size='small'
                  value={state.layout.chart?.type || 'bar'}
                  label='图表类型'
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        chart: { ...prev.layout.chart!, type: e.target.value as ChartType },
                      },
                    }))
                  }
                >
                  <MenuItem value='line'>折线图</MenuItem>
                  <MenuItem value='bar'>柱状图</MenuItem>
                  <MenuItem value='pie'>饼图</MenuItem>
                  <MenuItem value='area'>面积图</MenuItem>
                  <MenuItem value='scatter'>散点图</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel size='small'>X轴字段</InputLabel>
                <Select
                  size='small'
                  value={state.layout.chart?.xAxisField || ''}
                  label='X轴字段'
                  onChange={(e) =>
                    setState((prev: any) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        chart: { ...prev.layout.chart, xAxisField: e.target.value },
                      },
                    }))
                  }
                >
                  {state.selectedFields
                    .filter((f) => f.visible)
                    .map((f) => (
                      <MenuItem
                        key={f.fieldId}
                        value={f.fieldId}
                      >
                        {f.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel size='small'>Y轴字段</InputLabel>
                <Select
                  size='small'
                  multiple
                  value={state.layout.chart?.yAxisFields || []}
                  label='Y轴字段'
                  onChange={(e) =>
                    setState((prev: any) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        chart: { ...prev.layout.chart, yAxisFields: e.target.value as string[] },
                      },
                    }))
                  }
                >
                  {state.selectedFields
                    .filter((f) => f.visible && f.type === 'number')
                    .map((f) => (
                      <MenuItem
                        key={f.fieldId}
                        value={f.fieldId}
                      >
                        {f.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.layout.chart?.showLegend}
                      onChange={(e) =>
                        setState((prev: any) => ({
                          ...prev,
                          layout: {
                            ...prev.layout,
                            chart: { ...prev.layout.chart, showLegend: e.target.checked },
                          },
                        }))
                      }
                    />
                  }
                  label='显示图例'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.layout.chart?.showGrid}
                      onChange={(e) =>
                        setState((prev: any) => ({
                          ...prev,
                          layout: { ...prev.layout.chart, showGrid: e.target.checked },
                        }))
                      }
                    />
                  }
                  label='显示网格'
                />
              </Box>
            </Box>
          </Box>
        )}

        {state.layout.type === 'card' && (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 2 }}
            >
              卡片配置
            </Typography>
            <FormControl>
              <InputLabel size='small'>列数</InputLabel>
              <Select
                size='small'
                value={state.layout.columns}
                label='列数'
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, columns: e.target.value as number },
                  }))
                }
              >
                <MenuItem value={1}>单列</MenuItem>
                <MenuItem value={2}>两列</MenuItem>
                <MenuItem value={3}>三列</MenuItem>
                <MenuItem value={4}>四列</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={state.layout.showHeader}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, showHeader: e.target.checked },
                  }))
                }
              />
            }
            label='显示表头'
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.layout.showFooter}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, showFooter: e.target.checked },
                  }))
                }
              />
            }
            label='显示表尾'
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.layout.pagination}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, pagination: e.target.checked },
                  }))
                }
              />
            }
            label='分页显示'
          />
        </Box>

        {state.layout.pagination && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel size='small'>每页条数</InputLabel>
            <Select
              size='small'
              value={state.layout.pageSize}
              label='每页条数'
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  layout: { ...prev.layout, pageSize: e.target.value as number },
                }))
              }
            >
              <MenuItem value={5}>5条/页</MenuItem>
              <MenuItem value={10}>10条/页</MenuItem>
              <MenuItem value={20}>20条/页</MenuItem>
              <MenuItem value={50}>50条/页</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>
    );
  };

  const renderPreviewTable = () => {
    const visibleFields = state.selectedFields.filter((f) => f.visible);
    if (visibleFields.length === 0) return null;

    return (
      <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {state.layout.showHeader && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: visibleFields.map(() => '1fr').join(' '),
              px: 2,
              py: 1.5,
              bgcolor: 'grey.100',
              fontWeight: 600,
            }}
          >
            {visibleFields.map((field) => (
              <Typography
                key={field.fieldId}
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {field.label}
              </Typography>
            ))}
          </Box>
        )}
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {previewData
            .slice(0, state.layout.pagination ? state.layout.pageSize : previewData.length)
            .map((row, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: visibleFields.map(() => '1fr').join(' '),
                  px: 2,
                  py: 1.5,
                  borderBottom: idx < previewData.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                {visibleFields.map((field) => (
                  <Typography
                    key={field.fieldId}
                    variant='body2'
                  >
                    {row[field.fieldName] || '-'}
                  </Typography>
                ))}
              </Box>
            ))}
        </Box>
        {state.layout.showFooter && (
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', textAlign: 'right' }}>
            <Typography
              variant='caption'
              sx={{ color: 'grey.500' }}
            >
              共 {previewData.length} 条记录
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  const renderPreviewChart = () => {
    const _chartType = state.layout.chart?.type || 'bar';
    const xField = state.selectedFields.find((f) => f.fieldId === state.layout.chart?.xAxisField);
    const yFields = (state.layout.chart?.yAxisFields || [])
      .map((id) => state.selectedFields.find((f) => f.fieldId === id))
      .filter(Boolean) as SelectedField[];

    if (!xField || yFields.length === 0) {
      return (
        <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <BarChart3 sx={{ width: 48, height: 48, color: 'grey.300', mx: 'auto', mb: 2 }} />
          <Typography
            variant='body1'
            sx={{ color: 'grey.400' }}
          >
            请配置图表字段
          </Typography>
        </Box>
      );
    }

    const chartColors = ['#6366f1', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

    return (
      <Paper sx={{ p: 3, borderRadius: 1 }}>
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            gap: 1,
          }}
        >
          {previewData.slice(0, 5).map((row, idx) => (
            <Box
              key={idx}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <Typography
                variant='caption'
                sx={{ mb: 1, color: 'grey.600' }}
              >
                {row[xField.fieldName]}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {yFields.map((yField, yIdx) => {
                  const value = row[yField.fieldName] || 0;
                  const maxValue = Math.max(...previewData.map((r) => r[yField.fieldName] || 0), 1);
                  const height = (value / maxValue) * 100;
                  return (
                    <Box
                      key={yIdx}
                      sx={{
                        width: 20,
                        height: `${height}%`,
                        bgcolor: chartColors[yIdx % chartColors.length],
                        borderRadius: '4px 4px 0 0',
                        minHeight: 10,
                        transition: 'height 0.3s',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
        {state.layout.chart?.showLegend && yFields.length > 1 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 3 }}>
            {yFields.map((yField, idx) => (
              <Box
                key={idx}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    bgcolor: chartColors[idx % chartColors.length],
                    borderRadius: 2,
                  }}
                />
                <Typography variant='caption'>{yField.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  const renderPreviewCards = () => {
    const visibleFields = state.selectedFields.filter((f) => f.visible);
    if (visibleFields.length === 0) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${state.layout.columns}, 1fr)`,
          gap: 2,
        }}
      >
        {previewData
          .slice(0, state.layout.pagination ? state.layout.pageSize : previewData.length)
          .map((row, idx) => (
            <Paper
              key={idx}
              sx={{ p: 2, borderRadius: 1 }}
            >
              {visibleFields.map((field) => (
                <Box
                  key={field.fieldId}
                  sx={{ mb: 1 }}
                >
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    {field.label}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {row[field.fieldName] || '-'}
                  </Typography>
                </Box>
              ))}
            </Paper>
          ))}
      </Box>
    );
  };

  const renderPreview = () => {
    switch (state.layout.type) {
      case 'chart':
        return renderPreviewChart();
      case 'card':
        return renderPreviewCards();
      default:
        return renderPreviewTable();
    }
  };

  const tabs = [
    { label: '字段', icon: <Table sx={{ width: 16, height: 16 }} /> },
    { label: '布局', icon: <LayoutGrid sx={{ width: 16, height: 16 }} /> },
    { label: '预览', icon: <Eye sx={{ width: 16, height: 16 }} /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 0.5 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          label='报表标题'
          value={state.title}
          onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label='报表描述'
          multiline
          rows={2}
          value={state.description}
          onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>{renderDataSourcePanel()}</Paper>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          {tabs.map((tab, idx) => (
            <Tab
              key={idx}
              label={tab.label}
              icon={tab.icon}
              iconPosition='start'
            />
          ))}
        </Tabs>

        <Divider sx={{ mb: 3 }} />

        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {renderFieldSelector()}
            <Divider />
            {renderFilterPanel()}
            {renderGroupPanel()}
          </Box>
        )}

        {activeTab === 1 && renderLayoutPanel()}

        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, color: 'grey.600' }}
            >
              预览效果
            </Typography>
            {renderPreview()}
          </Box>
        )}
      </Paper>

      <Box sx={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: 2, zIndex: 100 }}>
        <Button
          variant='outlined'
          startIcon={<Eye sx={{ width: 16, height: 16 }} />}
          onClick={handlePreview}
          sx={{ borderRadius: 1 }}
        >
          预览
        </Button>
        <Button
          variant='outlined'
          startIcon={<Download sx={{ width: 16, height: 16 }} />}
          onClick={() => handleExport('excel')}
          sx={{ borderRadius: 1 }}
        >
          导出
        </Button>
        <Button
          variant='contained'
          startIcon={<Save sx={{ width: 16, height: 16 }} />}
          onClick={handleSave}
          sx={{ borderRadius: 1 }}
        >
          保存
        </Button>
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant='h6'>报表预览</Typography>
          <Typography
            variant='subtitle1'
            sx={{ color: 'grey.500' }}
          >
            {state.title || '未命名报表'}
          </Typography>
        </DialogTitle>
        <DialogContent>{renderPreview()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
          <Button onClick={() => handleExport('excel')}>导出Excel</Button>
          <Button onClick={() => handleExport('pdf')}>导出PDF</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportDesignerTemplate;
