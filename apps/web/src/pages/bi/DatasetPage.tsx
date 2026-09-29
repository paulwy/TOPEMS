import { useState, useMemo, useCallback } from 'react';
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
  CircularProgress,
} from '@mui/material';
import i18n from '@/i18n';
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
  type SqlTestResult,
} from '@/api/bi';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;
type ViewMode = 'list' | 'editor';
const DatasetPage = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [editorTab, setEditorTab] = useState(0);
  const [sqlTestResult, setSqlTestResult] = useState<SqlTestResult | null>(null);
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
      setSqlTestResult((res?.data?.data as SqlTestResult | undefined) ?? null);
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
  const getStatusChip = (status: string) => {
    const configs: Record<string, { color: 'success' | 'warning' | 'primary'; label: string }> = {
      published: { color: 'success', label: i18n.t('bi.dataset_page.text_dca0c1') },
      draft: { color: 'warning', label: i18n.t('bi.dataset_page.text_22b433') },
      archived: { color: 'primary', label: i18n.t('bi.dataset_page.text_c3ba16') },
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
          <Typography variant='h6'>{i18n.t('bi.dataset_page.k0')}</Typography>
          <Typography variant='body2'>{i18n.t('bi.dataset_page.k1')}</Typography>
          <Button
            variant='contained'
            startIcon={<Plus />}
            sx={{ mt: 3 }}
            onClick={handleCreate}
          >
            {i18n.t('pages.dataset_page.k3')}
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
                <TableCell>{i18n.t('bi.dataset_page.k2')}</TableCell>
                <TableCell>{i18n.t('bi.dataset_page.k3')}</TableCell>
                <TableCell>{i18n.t('bi.dataset_page.k4')}</TableCell>
                <TableCell>{i18n.t('bi.dataset_page.k5')}</TableCell>
                <TableCell>{i18n.t('bi.dataset_page.k6')}</TableCell>
                <TableCell align='right'>{i18n.t('bi.dataset_page.k7')}</TableCell>
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
                    <Tooltip title={i18n.t('bi.dataset_page.edit')}>
                      <IconButton
                        size='small'
                        onClick={() => handleEdit(dataset)}
                        aria-label={i18n.t('bi.dataset_page.edit_1')}
                      >
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={i18n.t('bi.dataset_page.view')}>
                      <IconButton
                        size='small'
                        aria-label={i18n.t('bi.dataset_page.view_1')}
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                    {dataset.status === 'draft' && (
                      <Tooltip title={i18n.t('bi.dataset_page.text_83611a')}>
                        <IconButton
                          size='small'
                          onClick={() => handlePublish(dataset.id)}
                          aria-label={i18n.t('bi.dataset_page.text_490e76')}
                        >
                          <FileText size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {dataset.status === 'published' && (
                      <Tooltip title={i18n.t('bi.dataset_page.refresh')}>
                        <IconButton
                          size='small'
                          onClick={() => handleRefreshDataset(dataset.id)}
                          aria-label={i18n.t('bi.dataset_page.refresh_1')}
                        >
                          <RefreshCw size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={i18n.t('bi.dataset_page.delete')}>
                      <IconButton
                        size='small'
                        onClick={() => handleDelete(dataset.id)}
                        aria-label={i18n.t('bi.dataset_page.delete_1')}
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
            <Tab label={i18n.t('bi.dataset_page.text_5656f1')} />
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
                  label={i18n.t('bi.dataset_page.text_c11322')}
                  onChange={(e) => setFormData({ ...formData, data_source_id: e.target.value })}
                >
                  <MenuItem value='ds-mysql-001'>{i18n.t('bi.dataset_page.k9')}</MenuItem>
                  <MenuItem value='ds-mysql-002'>{i18n.t('pages.dataset_page.me_0')}</MenuItem>
                  <MenuItem value='ds-postgres-001'>{i18n.t('bi.dataset_page.k10')}</MenuItem>
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
      title={i18n.t('bi.dataset_page.text_db302a')}
      subtitle={i18n.t('bi.dataset_page.text_3392ac')}
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
        breadcrumbs={[
          { label: i18n.t('bi.dataset_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: i18n.t('bi.dataset_page.text_e20804') },
        ]}
      >
        {viewMode === 'list' ? renderListView() : renderEditorView()}
      </DashboardTemplate>
    </PageContainer>
  );
};
export default DatasetPage;
