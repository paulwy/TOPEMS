import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Play,
  Database,
  Search,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  CircularProgress,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import {
  listDatasets,
  createDataset,
  updateDataset,
  deleteDataset,
  type Dataset,
  type DatasetField,
  type DataSource,
} from '@/api/bi';
import { logger } from '@/utils/logger';

type ViewMode = 'list' | 'editor';

const mockDatasets: Dataset[] = [
  {
    id: 'ds-001',
    name: '销售数据分析集',
    description: '包含销售订单、客户、产品等维度的销售分析数据',
    data_source_id: 'ds-mysql-001',
    data_source_name: '业务主数据库',
    status: 'published',
    row_count: 125860,
    refresh_frequency: 'hourly',
    last_refresh: '2026-06-28T08:00:00Z',
    fields: [
      { id: 'f1', name: 'order_date', label: '订单日期', type: 'date', is_dimension: true },
      { id: 'f2', name: 'customer_name', label: '客户名称', type: 'string', is_dimension: true },
      { id: 'f3', name: 'product_name', label: '产品名称', type: 'string', is_dimension: true },
      { id: 'f4', name: 'category', label: '产品类别', type: 'string', is_dimension: true },
      { id: 'f5', name: 'quantity', label: '数量', type: 'number', is_measure: true, aggregation: 'sum' },
      { id: 'f6', name: 'amount', label: '金额', type: 'number', is_measure: true, aggregation: 'sum' },
    ],
    created_at: '2026-01-15T10:30:00Z',
    updated_at: '2026-06-28T08:00:00Z',
  },
  {
    id: 'ds-002',
    name: '生产质量数据集',
    description: '生产过程质量检验数据，包含缺陷类型、检验结果等',
    data_source_id: 'ds-mysql-002',
    data_source_name: 'MES生产数据库',
    status: 'published',
    row_count: 89450,
    refresh_frequency: 'daily',
    last_refresh: '2026-06-28T00:00:00Z',
    fields: [
      { id: 'f1', name: 'inspection_date', label: '检验日期', type: 'date', is_dimension: true },
      { id: 'f2', name: 'product_line', label: '生产线', type: 'string', is_dimension: true },
      { id: 'f3', name: 'defect_type', label: '缺陷类型', type: 'string', is_dimension: true },
      { id: 'f4', name: 'inspection_result', label: '检验结果', type: 'string', is_dimension: true },
      { id: 'f5', name: 'defect_count', label: '缺陷数量', type: 'number', is_measure: true, aggregation: 'sum' },
    ],
    created_at: '2026-02-20T14:00:00Z',
    updated_at: '2026-06-28T00:00:00Z',
  },
  {
    id: 'ds-003',
    name: '库存周转数据集',
    description: '仓库库存周转率分析数据，包含出入库、库存余额等',
    data_source_id: 'ds-mysql-001',
    data_source_name: '业务主数据库',
    status: 'draft',
    row_count: 45200,
    refresh_frequency: 'weekly',
    last_refresh: '2026-06-23T00:00:00Z',
    fields: [
      { id: 'f1', name: 'warehouse', label: '仓库', type: 'string', is_dimension: true },
      { id: 'f2', name: 'material', label: '物料', type: 'string', is_dimension: true },
      { id: 'f3', name: 'stock_in', label: '入库数量', type: 'number', is_measure: true, aggregation: 'sum' },
      { id: 'f4', name: 'stock_out', label: '出库数量', type: 'number', is_measure: true, aggregation: 'sum' },
      { id: 'f5', name: 'stock_balance', label: '库存余额', type: 'number', is_measure: true, aggregation: 'sum' },
    ],
    created_at: '2026-05-10T09:00:00Z',
    updated_at: '2026-06-25T16:30:00Z',
  },
];

const DatasetPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [datasets, setDatasets] = useState<Dataset[]>(mockDatasets);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [editorTab, setEditorTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Dataset>>({
    name: '',
    description: '',
    data_source_id: '',
    status: 'draft',
    fields: [],
  });

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await listDatasets();
      if (res.success && res.data) {
        setDatasets(res.data.items || mockDatasets);
      }
    } catch (error: unknown) {
      logger.error('Failed to load datasets:', error);
      setDatasets(mockDatasets);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const filteredDatasets = datasets.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedDataset(null);
    setFormData({
      name: '',
      description: '',
      data_source_id: '',
      status: 'draft',
      fields: [],
    });
    setViewMode('editor');
    setEditorTab(0);
  };

  const handleEdit = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setFormData(dataset);
    setViewMode('editor');
    setEditorTab(0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个数据集吗？')) return;
    try {
      await deleteDataset(id);
      setDatasets(datasets.filter((d) => d.id !== id));
    } catch (error: unknown) {
      logger.error('Failed to delete dataset:', error);
      setDatasets(datasets.filter((d) => d.id !== id));
    }
  };

  const handleSave = async () => {
    try {
      if (selectedDataset) {
        await updateDataset(selectedDataset.id, formData);
      } else {
        await createDataset(formData);
      }
      setViewMode('list');
      loadDatasets();
    } catch (error: unknown) {
      logger.error('Failed to save dataset:', error);
      setViewMode('list');
    }
  };

  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'primary'; label: string }> = {
      published: { color: 'success', label: '已发布' },
      draft: { color: 'warning', label: '草稿' },
      archived: { color: 'primary', label: '已归档' },
    };
    const config = configs[status] || configs.draft;
    return (
      <Chip
        label={config.label}
        size='small'
        color={config.color}
        variant='outlined'
      />
    );
  };

  const addField = () => {
    const newField: DatasetField = {
      id: `field-${Date.now()}`,
      name: `field_${(formData.fields?.length || 0) + 1}`,
      label: `字段${(formData.fields?.length || 0) + 1}`,
      type: 'string',
    };
    setFormData({
      ...formData,
      fields: [...(formData.fields || []), newField],
    });
  };

  const removeField = (fieldId: string) => {
    setFormData({
      ...formData,
      fields: formData.fields?.filter((f) => f.id !== fieldId) || [],
    });
  };

  const updateField = (fieldId: string, updates: Partial<DatasetField>) => {
    setFormData({
      ...formData,
      fields: formData.fields?.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ) || [],
    });
  };

  const renderListView = () => (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          数据集管理
        </Typography>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={handleCreate}
        >
          创建数据集
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          placeholder='搜索数据集...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size='small'
          sx={{ width: 300 }}
        />
        <Button
          variant='outlined'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={loadDatasets}
        >
          刷新
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredDatasets.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 12,
            color: 'text.secondary',
          }}
        >
          <Database sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
          <Typography variant='h6'>暂无数据集</Typography>
          <Typography variant='body2'>点击上方按钮创建您的第一个数据集</Typography>
          <Button
            variant='contained'
            startIcon={<Plus />}
            sx={{ mt: 3 }}
            onClick={handleCreate}
          >
            创建数据集
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>数据集名称</TableCell>
                <TableCell>数据源</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>行数</TableCell>
                <TableCell>更新时间</TableCell>
                <TableCell align='right'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDatasets.map((dataset) => (
                <TableRow key={dataset.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          backgroundColor: '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Database sx={{ color: '#10B981', fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {dataset.name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {dataset.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{dataset.data_source_name || '-'}</TableCell>
                  <TableCell>{getStatusChip(dataset.status)}</TableCell>
                  <TableCell>{dataset.row_count?.toLocaleString() || '-'}</TableCell>
                  <TableCell>
                    {dataset.updated_at
                      ? new Date(dataset.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title='编辑'>
                      <IconButton size='small' onClick={() => handleEdit(dataset)}>
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='查看'>
                      <IconButton size='small'>
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='删除'>
                      <IconButton size='small' onClick={() => handleDelete(dataset.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderEditorView = () => (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant='outlined' size='small' onClick={() => setViewMode('list')}>
            返回列表
          </Button>
          <Typography variant='h5' sx={{ fontWeight: 600 }}>
            {selectedDataset ? '编辑数据集' : '创建数据集'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant='outlined' onClick={() => setViewMode('list')}>
            取消
          </Button>
          <Button variant='contained' onClick={handleSave}>
            保存
          </Button>
        </Box>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Tabs value={editorTab} onChange={(_, v) => setEditorTab(v)} sx={{ mb: 3 }}>
            <Tab label='基本信息' />
            <Tab label='字段配置' />
            <Tab label='SQL查询' />
          </Tabs>

          {editorTab === 0 && (
            <Box sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label='数据集名称'
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label='描述'
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                sx={{ mb: 3 }}
              />
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>数据源</InputLabel>
                <Select
                  value={formData.data_source_id || ''}
                  label='数据源'
                  onChange={(e) => setFormData({ ...formData, data_source_id: e.target.value })}
                >
                  <MenuItem value='ds-mysql-001'>业务主数据库</MenuItem>
                  <MenuItem value='ds-mysql-002'>MES生产数据库</MenuItem>
                  <MenuItem value='ds-postgres-001'>数据仓库</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status || 'draft'}
                  label='状态'
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
                >
                  <MenuItem value='draft'>草稿</MenuItem>
                  <MenuItem value='published'>已发布</MenuItem>
                  <MenuItem value='archived'>已归档</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {editorTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<Plus size={16} />}
                  onClick={addField}
                >
                  添加字段
                </Button>
              </Box>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>字段名</TableCell>
                      <TableCell>显示名称</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell>维度/度量</TableCell>
                      <TableCell align='right'>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(formData.fields || []).map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <TextField
                            size='small'
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size='small'
                            value={field.label || ''}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size='small' sx={{ minWidth: 120 }}>
                            <Select
                              value={field.type}
                              onChange={(e) => updateField(field.id, { type: e.target.value as DatasetField['type'] })}
                            >
                              <MenuItem value='string'>字符串</MenuItem>
                              <MenuItem value='number'>数字</MenuItem>
                              <MenuItem value='date'>日期</MenuItem>
                              <MenuItem value='datetime'>日期时间</MenuItem>
                              <MenuItem value='boolean'>布尔</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <FormControl size='small' sx={{ minWidth: 120 }}>
                            <Select
                              value={field.is_dimension ? 'dimension' : 'measure'}
                              onChange={(e) =>
                                updateField(field.id, {
                                  is_dimension: e.target.value === 'dimension',
                                  is_measure: e.target.value === 'measure',
                                })
                              }
                            >
                              <MenuItem value='dimension'>维度</MenuItem>
                              <MenuItem value='measure'>度量</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton size='small' onClick={() => removeField(field.id)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {editorTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='subtitle1'>SQL 查询语句</Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<Play size={16} />}
                >
                  运行查询
                </Button>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={12}
                value={formData.sql_query || 'SELECT * FROM table_name'}
                onChange={(e) => setFormData({ ...formData, sql_query: e.target.value })}
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: 14,
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='数据集管理'
      subtitle='管理和配置数据分析数据集'
      headerProps={{
        pageIcon: <Database style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'BI' },
          { label: '数据集' },
        ]}
      >
        {viewMode === 'list' ? renderListView() : renderEditorView()}
      </DashboardTemplate>
    </PageContainer>
  );
};

export default DatasetPage;
