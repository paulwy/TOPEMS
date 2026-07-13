import { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Database,
  Server,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Table,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import {
  listDataSources,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  listTables,
} from '../../api/lowcode';
import type { DataSource, TableInfo } from '../../api/lowcode/types';
import { logger } from '@/utils/logger';

const DataSourcePage = () => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDs, setEditingDs] = useState<Partial<DataSource> | null>(null);
  const [formData, setFormData] = useState<Partial<DataSource>>({});

  const [testResult, setTestResult] = useState<{
    status: 'testing' | 'success' | 'error' | null;
    message?: string;
  }>({ status: null });

  const [tablesDialogOpen, setTablesDialogOpen] = useState(false);
  const [selectedDs, setSelectedDs] = useState<DataSource | null>(null);

  const queryClient = useQueryClient();

  const dataSourcesQuery = useQuery({
    queryKey: ['lowcode-datasources', page, pageSize, typeFilter, searchTerm],
    queryFn: async () => {
      const res = await listDataSources({
        page: page + 1,
        pageSize,
        type: typeFilter || undefined,
        search: searchTerm || undefined,
      });
      if (res.success) {
        return {
          items: res.data.items || [],
          total: res.data.total || 0,
        };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const datasources = dataSourcesQuery.data?.items || [];
  const total = dataSourcesQuery.data?.total || 0;
  const loading = dataSourcesQuery.isLoading;

  const tablesQuery = useQuery({
    queryKey: ['lowcode-datasource-tables', selectedDs?.id],
    queryFn: async () => {
      if (!selectedDs?.id) return [];
      const res = await listTables(selectedDs.id);
      if (res.success) {
        return res.data || [];
      }
      return [];
    },
    enabled: !!selectedDs?.id && tablesDialogOpen,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const tables = tablesQuery.data || [];
  const tablesLoading = tablesQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data: Omit<DataSource, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
      const res = await createDataSource(data);
      if (!res.success) {
        throw new Error('创建失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowcode-datasources'] });
    },
    onError: (error) => {
      logger.error('Failed to create datasource:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DataSource> }) => {
      const res = await updateDataSource(id, data);
      if (!res.success) {
        throw new Error('更新失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowcode-datasources'] });
    },
    onError: (error) => {
      logger.error('Failed to update datasource:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteDataSource(id);
      if (!res.success) {
        throw new Error('删除失败');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowcode-datasources'] });
    },
    onError: (error) => {
      logger.error('Failed to delete datasource:', error);
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await testDataSource(id);
      if (!res.success || !res.data) {
        throw new Error('连接失败');
      }
      return res.data;
    },
    onMutate: () => {
      setTestResult({ status: 'testing' });
    },
    onSuccess: () => {
      setTestResult({ status: 'success', message: '连接成功' });
    },
    onError: () => {
      setTestResult({ status: 'error', message: '连接失败，请检查配置' });
    },
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleCreate = () => {
    setEditingDs(null);
    setFormData({
      name: '',
      type: 'mysql',
      host: '',
      port: 3306,
      database: '',
      username: '',
      password: '',
      description: '',
    });
    setTestResult({ status: null });
    setDialogOpen(true);
  };

  const handleEdit = (ds: DataSource) => {
    setEditingDs(ds);
    setFormData({ ...ds, password: '' });
    setTestResult({ status: null });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingDs) {
      await updateMutation.mutateAsync({ id: editingDs.id!, data: formData });
    } else {
      await createMutation.mutateAsync(
        formData as Omit<DataSource, 'id' | 'status' | 'createdAt' | 'updatedAt'>
      );
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个数据源吗？')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleTest = async () => {
    if (editingDs && editingDs.id) {
      await testMutation.mutateAsync(editingDs.id);
    } else {
      setTestResult({ status: 'success', message: '测试连接成功（模拟）' });
    }
  };

  const handleViewTables = async (ds: DataSource) => {
    setSelectedDs(ds);
    setTablesDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mysql':
        return '🐬';
      case 'postgresql':
        return '🐘';
      case 'mongodb':
        return '🍃';
      case 'redis':
        return '🔴';
      default:
        return '💾';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mysql':
        return 'MySQL';
      case 'postgresql':
        return 'PostgreSQL';
      case 'mongodb':
        return 'MongoDB';
      case 'redis':
        return 'Redis';
      case 'elasticsearch':
        return 'Elasticsearch';
      case 'api':
        return 'API';
      default:
        return type;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'success' as const, icon: <CheckCircle size={16} />, label: '已连接' };
      case 'inactive':
        return { color: 'default' as const, icon: <Clock size={16} />, label: '未激活' };
      case 'error':
        return { color: 'error' as const, icon: <XCircle size={16} />, label: '异常' };
      default:
        return { color: 'default' as const, icon: <Clock size={16} />, label: status };
    }
  };

  const columns: ColumnDef<DataSource>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '数据源名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ fontSize: 24 }}>{getTypeIcon(row.type)}</Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontWeight: 500 }}>{row.name}</span>
                <Chip
                  label={getStatusConfig(row.status).label}
                  size='small'
                  color={getStatusConfig(row.status).color}
                  variant='outlined'
                />
              </Box>
              <span style={{ fontSize: 12, color: theme.palette.text.secondary }}>
                {getTypeLabel(row.type)} · {row.host}:{row.port}
              </span>
            </Box>
          </Box>
        ),
      },
      {
        id: 'database',
        label: '数据库',
        render: (row) => row.database || '-',
      },
      {
        id: 'description',
        label: '描述',
        render: (row) => row.description || '-',
      },
      {
        id: 'updatedAt',
        label: '更新时间',
        width: 180,
        render: (row) => new Date(row.updatedAt).toLocaleString('zh-CN'),
      },
    ],
    [theme.palette.text.secondary]
  );

  const rowActions: RowAction<DataSource>[] = useMemo(
    () => [
      {
        label: '查看表',
        icon: <Table style={{ width: 16, height: 16 }} />,
        onClick: (row) => handleViewTables(row),
      },
      {
        label: '编辑',
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '删除',
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row) => handleDelete(row.id),
        color: 'error',
      },
    ],
    []
  );

  return (
    <PageContainer
      title='数据源管理'
      subtitle='管理低代码平台的数据源连接'
      loading={loading}
      headerActions={
        <Button
          variant='contained'
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={handleCreate}
        >
          新建数据源
        </Button>
      }
    >
      <ListPageTemplate
        data={datasources}
        columns={columns}
        rowActions={rowActions}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        searchValue={searchTerm}
        onSearchChange={handleSearch}
        searchPlaceholder='搜索数据源...'
        filterContent={
          <FormControl
            size='small'
            sx={{ width: 180 }}
          >
            <InputLabel>数据源类型</InputLabel>
            <Select
              value={typeFilter}
              label='数据源类型'
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部</MenuItem>
              <MenuItem value='mysql'>MySQL</MenuItem>
              <MenuItem value='postgresql'>PostgreSQL</MenuItem>
              <MenuItem value='mongodb'>MongoDB</MenuItem>
              <MenuItem value='redis'>Redis</MenuItem>
            </Select>
          </FormControl>
        }
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingDs ? '编辑数据源' : '新建数据源'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label='数据源名称'
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size='small'
            />
            <FormControl size='small'>
              <InputLabel>类型</InputLabel>
              <Select
                value={formData.type || 'mysql'}
                label='类型'
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value='mysql'>MySQL</MenuItem>
                <MenuItem value='postgresql'>PostgreSQL</MenuItem>
                <MenuItem value='mongodb'>MongoDB</MenuItem>
                <MenuItem value='redis'>Redis</MenuItem>
              </Select>
            </FormControl>
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 8 }}>
                <TextField
                  label='主机地址'
                  value={formData.host || ''}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField
                  label='端口'
                  type='number'
                  value={formData.port || 3306}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  size='small'
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label='数据库名'
              value={formData.database || ''}
              onChange={(e) => setFormData({ ...formData, database: e.target.value })}
              size='small'
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='用户名'
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  size='small'
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='密码'
                  type='password'
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  size='small'
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label='描述'
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              size='small'
              multiline
              rows={2}
            />

            {testResult.status && (
              <Alert
                severity={
                  testResult.status === 'success'
                    ? 'success'
                    : testResult.status === 'error'
                      ? 'error'
                      : 'info'
                }
                icon={testResult.status === 'testing' ? <CircularProgress size={16} /> : undefined}
              >
                {testResult.message}
              </Alert>
            )}

            <Button
              variant='outlined'
              startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              onClick={handleTest}
              disabled={testResult.status === 'testing' || testMutation.isPending}
            >
              测试连接
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={tablesDialogOpen}
        onClose={() => setTablesDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedDs?.name} - 数据表列表</DialogTitle>
        <DialogContent dividers>
          {tablesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List dense>
              {tables.map((table, idx) => (
                <div key={table.name}>
                  <ListItem
                    secondaryAction={
                      <Chip
                        label={`${table.rows} 行`}
                        size='small'
                        variant='outlined'
                      />
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Table style={{ width: 18, height: 18, color: theme.palette.primary.main }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={table.label || table.name}
                      secondary={table.comment || table.name}
                    />
                  </ListItem>
                  {idx < tables.length - 1 && (
                    <Divider
                      variant='inset'
                      component='li'
                    />
                  )}
                </div>
              ))}
              {tables.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary='暂无数据表'
                    sx={{ textAlign: 'center', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTablesDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DataSourcePage;
