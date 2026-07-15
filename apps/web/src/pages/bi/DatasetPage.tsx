import { useState, useMemo, useCallback } from 'react';
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
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  datasetCrudApi,
  publishDataset,
  refreshDataset,
  testSqlQuery,
  type Dataset,
  type DatasetField,
  type DataSource,
} from '@/api/bi';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type ViewMode = 'list' | 'editor';

const DatasetPage = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
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

  const {
    data: datasets,
    loading,
    error,
    pagination,
    fetch,
    refresh,
    create: createItem,
    update: updateItem,
    delete: deleteItem,
  } = useCrudOperations<Dataset>({
    api: datasetCrudApi,
    queryKey: 'bi-datasets',
    defaultPageSize: 10,
    pageParamName: 'page',
    pageSizeParamName: 'pageSize',
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-datasets'] });
      logger.info('Dataset published successfully');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (id: string) => refreshDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-datasets'] });
      logger.info('Dataset refreshed successfully');
    },
  });

  const testSqlMutation = useMutation({
    mutationFn: ({ dataSourceId, sql }: { dataSourceId: string; sql: string }) =>
      testSqlQuery(dataSourceId, sql),
  });

  const displayDatasets = datasets;

  const filteredDatasets = useMemo(() => {
    return displayDatasets.filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [displayDatasets, searchTerm]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (value) {
        fetch({ search: value });
      } else {
        fetch({});
      }
    },
    [fetch]
  );

  const handleCreate = useCallback(() => {
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
  }, []);

  const handleEdit = useCallback((dataset: Dataset) => {
    setSelectedDataset(dataset);
    setFormData(dataset);
    setViewMode('editor');
    setEditorTab(0);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('确定要删除这个数据集吗？')) return;
      try {
        await deleteItem(id);
      } catch (e: unknown) {
        logger.error('Failed to delete dataset:', e);
      }
    },
    [deleteItem]
  );

  const handleSave = useCallback(async () => {
    try {
      if (selectedDataset) {
        await updateItem(selectedDataset.id, formData);
      } else {
        await createItem(formData);
      }
      setViewMode('list');
    } catch (e: unknown) {
      logger.error('Failed to save dataset:', e);
      setViewMode('list');
    }
  }, [selectedDataset, formData, createItem, updateItem]);

  const handlePublish = useCallback(
    async (id: string) => {
      try {
        await publishMutation.mutateAsync(id);
      } catch (e: unknown) {
        logger.error('Failed to publish dataset:', e);
      }
    },
    [publishMutation]
  );

  const handleRefreshDataset = useCallback(
    async (id: string) => {
      try {
        await refreshMutation.mutateAsync(id);
      } catch (e: unknown) {
        logger.error('Failed to refresh dataset:', e);
      }
    },
    [refreshMutation]
  );

  const handleTestSql = useCallback(async () => {
    if (!formData.data_source_id || !formData.sql_query) return;
    try {
      await testSqlMutation.mutateAsync({
        dataSourceId: formData.data_source_id,
        sql: formData.sql_query,
      });
    } catch (e: unknown) {
      logger.error('SQL test failed:', e);
    }
  }, [formData.data_source_id, formData.sql_query, testSqlMutation]);

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
      fields: formData.fields?.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)) || [],
    });
  };

  const actionLoading =
    loading || publishMutation.isPending || refreshMutation.isPending || testSqlMutation.isPending;

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
        <Typography
          variant='h4'
          sx={{ fontWeight: 700 }}
        >
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
          onChange={(e) => handleSearch(e.target.value)}
          size='small'
          sx={{ width: 300 }}
        />
        <Button
          variant='outlined'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={refresh}
        >
          刷新
        </Button>
      </Box>

      {actionLoading ? (
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
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
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
                <TableRow
                  key={dataset.id}
                  hover
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          backgroundColor: ct.success[50],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Database sx={{ color: 'success.main', fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          {dataset.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {dataset.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{dataset.data_source_name || '-'}</TableCell>
                  <TableCell>{getStatusChip(dataset.status)}</TableCell>
                  <TableCell>{dataset.row_count?.toLocaleString() || '-'}</TableCell>
                  <TableCell>
                    {dataset.updated_at ? new Date(dataset.updated_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title='编辑'>
                      <IconButton
                        size='small'
                        onClick={() => handleEdit(dataset)}
                        aria-label='编辑数据集'
                      >
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='查看'>
                      <IconButton
                        size='small'
                        aria-label='查看数据集'
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                    {dataset.status === 'draft' && (
                      <Tooltip title='发布'>
                        <IconButton
                          size='small'
                          onClick={() => handlePublish(dataset.id)}
                          aria-label='发布数据集'
                        >
                          <FileText size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {dataset.status === 'published' && (
                      <Tooltip title='刷新数据'>
                        <IconButton
                          size='small'
                          onClick={() => handleRefreshDataset(dataset.id)}
                          aria-label='刷新数据集'
                        >
                          <RefreshCw size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title='删除'>
                      <IconButton
                        size='small'
                        onClick={() => handleDelete(dataset.id)}
                        aria-label='删除数据集'
                      >
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
          <Button
            variant='outlined'
            size='small'
            onClick={() => setViewMode('list')}
          >
            返回列表
          </Button>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {selectedDataset ? '编辑数据集' : '创建数据集'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            onClick={() => setViewMode('list')}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
          >
            保存
          </Button>
        </Box>
      </Box>

      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <CardContent>
          <Tabs
            value={editorTab}
            onChange={(_, v) => setEditorTab(v)}
            sx={{ mb: 3 }}
          >
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
              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    })
                  }
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
                          <FormControl
                            size='small'
                            sx={{ minWidth: 120 }}
                          >
                            <Select
                              value={field.type}
                              onChange={(e) =>
                                updateField(field.id, {
                                  type: e.target.value as DatasetField['type'],
                                })
                              }
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
                          <FormControl
                            size='small'
                            sx={{ minWidth: 120 }}
                          >
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
                          <IconButton
                            size='small'
                            onClick={() => removeField(field.id)}
                            aria-label='删除字段'
                          >
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
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='subtitle1'>SQL 查询语句</Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<Play size={16} />}
                  onClick={handleTestSql}
                  disabled={testSqlMutation.isPending}
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
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: 'BI' }, { label: '数据集' }]}
      >
        {viewMode === 'list' ? renderListView() : renderEditorView()}
      </DashboardTemplate>
    </PageContainer>
  );
};

export default DatasetPage;
