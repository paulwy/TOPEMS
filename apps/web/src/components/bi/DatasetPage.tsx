import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './DatasetPage.module.css';
import { Plus, Edit2, Trash2, Eye, Play, Database, RefreshCw, FileText } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  IconButton,
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
  CircularProgress,
  Modal,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  datasetCrudApi,
  listDataSources,
  publishDataset,
  queryDataset,
  refreshDataset,
  testSqlQuery,
  type DataSource,
  type Dataset,
  type DatasetQueryResult,
  type DatasetField,
  type SqlTestResult,
} from '@/api/bi';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

type ViewMode = 'list' | 'editor';
const DatasetPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [editorTab, setEditorTab] = useState(0);
  const [sqlTestResult, setSqlTestResult] = useState<SqlTestResult | null>(null);
  const [queryResult, setQueryResult] = useState<DatasetQueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [viewDataset, setViewDataset] = useState<Dataset | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false);
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
  // 加载真实数据源列表（创建数据集时 Select 需展示，且外键需有效 datasource id）
  useEffect(() => {
    let cancelled = false;
    setDataSourcesLoading(true);
    listDataSources({ page: 1, pageSize: 200 })
      .then((res) => {
        if (cancelled) return;
        const items = (res?.data?.items as DataSource[] | undefined) ?? [];
        setDataSources(items);
      })
      .catch((err) => {
        if (!cancelled) {
          logger.warn('Failed to load datasources', err);
          setDataSources([]);
        }
      })
      .finally(() => {
        if (!cancelled) setDataSourcesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const publishMutation = useMutation({
    mutationFn: (id: string) => publishDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DATASETS_2_BASE,
        exact: false,
        refetchType: 'active',
      });
      logger.info('Dataset published successfully');
    },
  });
  const refreshMutation = useMutation({
    mutationFn: (id: string) => refreshDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DATASETS_2_BASE,
        exact: false,
        refetchType: 'active',
      });
      logger.info('Dataset refreshed successfully');
    },
  });
  const testSqlMutation = useMutation({
    mutationFn: ({ dataSourceId, sql }: { dataSourceId: string; sql: string }) =>
      testSqlQuery(dataSourceId, sql),

    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DATASETS_2_BASE,
        exact: false,
        refetchType: 'active',
      });
      // 适配后端 /datasets/test-sql 返回结构 {columns, data, valid}
      // axios 层已解包 body → res={success,data,message}，结果对象在 res.data（res.data.data 是行数组）
      setSqlTestResult((res?.data as SqlTestResult | undefined) ?? null);
    },
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
      if (!confirm(i18n.t('bi.dataset_page.confirm'))) return;
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
  const handleView = useCallback(async (dataset: Dataset) => {
    setViewDataset(dataset);
    setQueryResult(null);
    setQueryLoading(true);
    try {
      const res = await queryDataset({ dataset_id: dataset.id });
      // axios 已解包 body → res={success,data,message}，结果对象在 res.data
      setQueryResult((res?.data as DatasetQueryResult | undefined) ?? null);
    } catch (e: unknown) {
      logger.error('Dataset query failed:', e);
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  }, []);
  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'primary'; label: string }> = {
      published: { color: 'success', label: i18n.t('bi.dataset_page.status_published') },
      draft: { color: 'warning', label: i18n.t('bi.dataset_page.status_draft') },
      archived: { color: 'primary', label: i18n.t('bi.dataset_page.status_archived') },
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
      label: `${i18n.t('pages.dataset_page.k0')}${(formData.fields?.length || 0) + 1}`,
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

  // 列表表格列配置
  const datasetColumns: ColumnDef<Dataset>[] = [
    {
      id: 'name',
      label: i18n.t('bi.dataset_page.k2'),
      render: (dataset) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: theme.palette.success[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database sx={{ color: 'success.700', fontSize: 20 }} />
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
      ),
    },
    {
      id: 'data_source_name',
      label: i18n.t('bi.dataset_page.k3'),
      render: (dataset) => dataset.data_source_name || '-',
    },
    {
      id: 'status',
      label: i18n.t('bi.dataset_page.k4'),
      render: (dataset) => getStatusChip(dataset.status),
    },
    {
      id: 'row_count',
      label: i18n.t('bi.dataset_page.k5'),
      render: (dataset) => dataset.row_count?.toLocaleString() || '-',
    },
    {
      id: 'updated_at',
      label: i18n.t('bi.dataset_page.k6'),
      render: (dataset) =>
        dataset.updated_at ? new Date(dataset.updated_at).toLocaleDateString() : '-',
    },
  ];

  const datasetRowActions: RowAction<Dataset>[] = [
    {
      key: 'edit',
      label: i18n.t('bi.dataset_page.edit'),
      icon: <Edit2 size={16} />,
      onClick: (dataset) => handleEdit(dataset),
    },
    {
      key: 'view',
      label: i18n.t('bi.dataset_page.view'),
      icon: <Eye size={16} />,
      onClick: (dataset) => handleView(dataset),
    },
    {
      key: 'publish',
      label: i18n.t('bi.dataset_page.publish_action'),
      icon: <FileText size={16} />,
      show: (dataset) => dataset.status === 'draft',
      onClick: (dataset) => handlePublish(dataset.id),
    },
    {
      key: 'refresh',
      label: i18n.t('bi.dataset_page.refresh'),
      icon: <RefreshCw size={16} />,
      show: (dataset) => dataset.status === 'published',
      onClick: (dataset) => handleRefreshDataset(dataset.id),
    },
    {
      key: 'delete',
      label: i18n.t('bi.dataset_page.delete'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: (dataset) => handleDelete(dataset.id),
    },
  ];
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
          {i18n.t('pages.dataset_page.k0')}
        </Typography>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={handleCreate}
        >
          {i18n.t('pages.dataset_page.k1')}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          placeholder={i18n.t('bi.dataset_page.search')}
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
          {i18n.t('pages.dataset_page.k2')}
        </Button>
      </Box>
      <ListPageTemplate
        columns={datasetColumns}
        data={filteredDatasets}
        loading={actionLoading}
        getRowId={(row) => row.id}
        rowActions={datasetRowActions}
        emptyMessage={i18n.t('bi.dataset_page.k1')}
        emptyIcon={<Database sx={{ width: 64, height: 64, opacity: 0.5 }} />}
        emptyActionButton={{
          label: i18n.t('pages.dataset_page.k3'),
          icon: <Plus />,
          onClick: handleCreate,
        }}
      />
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
            {i18n.t('pages.dataset_page.k4')}
          </Button>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {selectedDataset ? i18n.t('bi.dataset_page.edit_1') : i18n.t('bi.dataset_page.create')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            onClick={() => setViewMode('list')}
          >
            {i18n.t('pages.dataset_page.k5')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
          >
            {i18n.t('pages.dataset_page.k6')}
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
            <Tab label={i18n.t('bi.dataset_page.info')} />
            <Tab label={i18n.t('bi.dataset_page.fields_tab')} />
            <Tab label={i18n.t('bi.dataset_page.search_1')} />
          </Tabs>
          {editorTab === 0 && (
            <Box sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label={i18n.t('bi.dataset_page.name')}
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label={i18n.t('bi.dataset_page.description')}
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
                <InputLabel>{i18n.t('bi.dataset_page.k8')}</InputLabel>
                <Select
                  value={formData.data_source_id || ''}
                  label={i18n.t('bi.dataset_page.datasource_tab')}
                  onChange={(e) => setFormData({ ...formData, data_source_id: e.target.value })}
                  disabled={dataSourcesLoading}
                >
                  {dataSourcesLoading && (
                    <MenuItem
                      value=''
                      disabled
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        {i18n.t('bi.dataset_page.loading')}
                      </Box>
                    </MenuItem>
                  )}
                  {!dataSourcesLoading && dataSources.length === 0 && (
                    <MenuItem
                      value=''
                      disabled
                    >
                      {i18n.t('bi.dataset_page.no_data_sources')}
                    </MenuItem>
                  )}
                  {dataSources.map((ds) => (
                    <MenuItem
                      key={ds.id}
                      value={ds.id}
                    >
                      {ds.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>{i18n.t('bi.dataset_page.k11')}</InputLabel>
                <Select
                  value={formData.status || 'draft'}
                  label={i18n.t('bi.dataset_page.status')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    })
                  }
                >
                  <MenuItem value='draft'>{i18n.t('bi.dataset_page.k12')}</MenuItem>
                  <MenuItem value='published'>{i18n.t('bi.dataset_page.k13')}</MenuItem>
                  <MenuItem value='archived'>{i18n.t('bi.dataset_page.k14')}</MenuItem>
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
                  {i18n.t('pages.dataset_page.k7')}
                </Button>
              </Box>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('bi.dataset_page.k15')}</TableCell>
                      <TableCell>{i18n.t('bi.dataset_page.k16')}</TableCell>
                      <TableCell>{i18n.t('bi.dataset_page.k17')}</TableCell>
                      {i18n.t('pages.dataset_page.k0')}
                      <TableCell align='right'>{i18n.t('bi.dataset_page.k18')}</TableCell>
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
                              <MenuItem value='string'>{i18n.t('bi.dataset_page.k19')}</MenuItem>
                              <MenuItem value='number'>{i18n.t('bi.dataset_page.k20')}</MenuItem>
                              <MenuItem value='date'>{i18n.t('bi.dataset_page.k21')}</MenuItem>
                              <MenuItem value='datetime'>{i18n.t('bi.dataset_page.k22')}</MenuItem>
                              <MenuItem value='boolean'>{i18n.t('bi.dataset_page.k23')}</MenuItem>
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
                              <MenuItem value='dimension'>{i18n.t('bi.dataset_page.k24')}</MenuItem>
                              <MenuItem value='measure'>{i18n.t('bi.dataset_page.k25')}</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            onClick={() => removeField(field.id)}
                            aria-label={i18n.t('bi.dataset_page.delete_2')}
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
                <Typography variant='subtitle1'>{i18n.t('pages.dataset_page.ql_1')}</Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<Play size={16} />}
                  onClick={handleTestSql}
                  disabled={testSqlMutation.isPending}
                >
                  {i18n.t('pages.dataset_page.k8')}
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
              {sqlTestResult && (
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1 }}
                  >
                    {i18n.t('pages.dataset_page.sql_test_result')}
                  </Typography>
                  {sqlTestResult.columns.length > 0 ? (
                    <TableContainer
                      component={Paper}
                      sx={{ maxHeight: 320 }}
                    >
                      <Table
                        size='small'
                        stickyHeader
                      >
                        <TableHead>
                          <TableRow>
                            {sqlTestResult.columns.map((col) => (
                              <TableCell key={col}>{col}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sqlTestResult.data.map((row, idx) => (
                            <TableRow key={idx}>
                              {sqlTestResult.columns.map((col) => (
                                <TableCell key={col}>
                                  {String((row as Record<string, unknown>)[col] ?? '')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('pages.dataset_page.sql_test_empty')}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
  return (
    <PageContainer
      title={i18n.t('bi.dataset_page.page_title')}
      subtitle={i18n.t('bi.dataset_page.page_subtitle')}
      headerProps={{
        pageIcon: <Database className={styles.il1} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        breadcrumbs={[
          { label: i18n.t('bi.dataset_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: i18n.t('bi.dataset_page.dataset_tab') },
        ]}
      >
        {viewMode === 'list' ? renderListView() : renderEditorView()}
      </DashboardTemplate>
      <Modal
        open={viewDataset !== null}
        onClose={() => setViewDataset(null)}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%',
            maxWidth: 960,
            maxHeight: '75vh',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            overflow: 'auto',
          }}
        >
          <Typography
            variant='h6'
            sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            {viewDataset?.name}
            <IconButton
              size='small'
              onClick={() => setViewDataset(null)}
              aria-label='close'
            >
              <Typography variant='body2'>✕</Typography>
            </IconButton>
          </Typography>
          {queryLoading ? (
            <CircularProgress size={24} />
          ) : queryResult ? (
            <>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mb: 1, display: 'block' }}
              >
                {i18n.t('bi.dataset_page.query_rows_summary', {
                  total: queryResult.total,
                  execution_time: queryResult.execution_time ?? '-',
                })}
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ maxHeight: 400 }}
              >
                <Table
                  size='small'
                  stickyHeader
                >
                  <TableHead>
                    <TableRow>
                      {queryResult.columns.map((col) => (
                        <TableCell key={col}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {queryResult.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {queryResult.columns.map((col) => (
                          <TableCell key={col}>
                            {String((row as Record<string, unknown>)[col] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('bi.dataset_page.query_empty')}
            </Typography>
          )}
        </Box>
      </Modal>
    </PageContainer>
  );
};
export default DatasetPage;
