import { Grid } from '@/components';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  Table,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileCode,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  MenuItem,
  InputAdornment,
  Stack,
  Tooltip,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  FormControlLabel,
  Checkbox as MuiCheckbox,
  Select,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  dbStructureApi,
  type TableInfo,
  type TableDetail,
  type ColumnInfo,
  type DbChange,
  type DbColumnDefinition,
  type SqlPreview,
} from '@/api/system';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
const DatabaseStructurePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'structure' | 'changes'>('structure');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<SqlPreview | null>(null);
  const [pendingColumn, setPendingColumn] = useState<DbColumnDefinition | null>(null);
  const [newColumn, setNewColumn] = useState<DbColumnDefinition>({
    column_name: '',
    data_type: 'VARCHAR',
    is_nullable: true,
    default_value: '',
    max_length: 255,
  });
  const tablesQuery = useQuery<TableInfo[]>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLES_BASE,
    queryFn: async () => {
      const res = await dbStructureApi.listTables({ schema: 'public' });
      return res.success && res.data ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const dbChangesQuery = useQuery<DbChange[]>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_CHANGES_BASE,
    queryFn: async () => {
      const res = await dbStructureApi.listChanges({ pagesize: 50 });
      return res.success && res.data ? res.data.items || [] : [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const tableDetailQuery = useQuery<TableDetail>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_DB_TABLE_DETAIL_BASE, selectedTable?.table_name],
    queryFn: async () => {
      const res = await dbStructureApi.getTableDetail(selectedTable!.table_name);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || i18n.t('admin.database_structure_page.loading_fail'));
    },
    enabled: !!selectedTable?.table_name && activeTab === 'structure',
    staleTime: 5 * 60 * 1000,
  });
  const loading = tablesQuery.isLoading;
  const detailLoading = tableDetailQuery.isLoading;
  const tables = tablesQuery.data ?? [];
  const dbChanges = dbChangesQuery.data ?? [];
  useEffect(() => {
    if (tableDetailQuery.data) {
      setSelectedTable(tableDetailQuery.data);
    }
  }, [tableDetailQuery.data]);
  useEffect(() => {
    if (tablesQuery.isError) {
      showNotification(
        'error',
        extractErrorMessage(
          tablesQuery.error,
          i18n.t('admin.database_structure_page.loading_list_fail')
        )
      );
    }
  }, [tablesQuery.isError, tablesQuery.error]);
  useEffect(() => {
    if (dbChangesQuery.isError) {
      apiLogger.error(
        i18n.t('admin.database_structure_page.loading_changes_fail'),
        dbChangesQuery.error
      );
    }
  }, [dbChangesQuery.isError, dbChangesQuery.error]);
  useEffect(() => {
    if (tableDetailQuery.isError) {
      showNotification(
        'error',
        extractErrorMessage(
          tableDetailQuery.error,
          i18n.t('admin.database_structure_page.loading_fail')
        )
      );
    }
  }, [tableDetailQuery.isError, tableDetailQuery.error]);
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };
  const handleNotificationClose = () => {
    setNotification(null);
  };
  const previewAddColumnMutation = useMutation({
    mutationFn: async (params: { table_name: string; column: DbColumnDefinition }) => {
      const res = await dbStructureApi.previewAddColumn(params);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || i18n.t('admin.database_structure_page.sql_fail'));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLES_BASE,
        exact: false,
        refetchType: 'active',
      });
      setSqlPreview(data);
      setPendingColumn(newColumn);
      setShowPreviewModal(true);
    },
    onError: (err: unknown) => {
      showNotification(
        'error',
        extractErrorMessage(err, i18n.t('admin.database_structure_page.sql_fail'))
      );
    },
  });
  const executeAddColumnMutation = useMutation({
    mutationFn: async (params: { table_name: string; column: DbColumnDefinition }) => {
      const res = await dbStructureApi.addColumn(params);
      if (res.success) return true;
      throw new Error(res.message || i18n.t('admin.database_structure_page.fail'));
    },
    onSuccess: async () => {
      showNotification('success', i18n.t('admin.database_structure_page.success'));
      setShowPreviewModal(false);
      setShowAddColumnModal(false);
      setNewColumn({
        column_name: '',
        data_type: 'VARCHAR',
        is_nullable: true,
        default_value: '',
        max_length: 255,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLE_DETAIL_BASE,
        exact: false,
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_CHANGES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      showNotification(
        'error',
        extractErrorMessage(err, i18n.t('admin.database_structure_page.fail'))
      );
    },
  });
  const dropColumnMutation = useMutation({
    mutationFn: async (params: { tableName: string; columnName: string }) => {
      const res = await dbStructureApi.dropColumn(params.tableName, params.columnName);
      if (res.success) return true;
      throw new Error(res.message || i18n.t('admin.database_structure_page.delete_fail'));
    },
    onSuccess: async () => {
      showNotification('success', i18n.t('admin.database_structure_page.delete_success'));
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_TABLE_DETAIL_BASE,
        exact: false,
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_DB_CHANGES_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      showNotification(
        'error',
        extractErrorMessage(err, i18n.t('admin.database_structure_page.delete_fail'))
      );
    },
  });
  const handlePreviewAddColumn = async () => {
    if (!selectedTable || !newColumn.column_name) {
      showNotification('error', i18n.t('admin.database_structure_page.fill'));
      return;
    }
    previewAddColumnMutation.mutate({
      table_name: selectedTable.table_name,
      column: newColumn,
    });
  };
  const handleExecuteAddColumn = async () => {
    if (!selectedTable || !pendingColumn) return;
    executeAddColumnMutation.mutate({
      table_name: selectedTable.table_name,
      column: pendingColumn,
    });
  };
  const handleDropColumn = async (columnName: string) => {
    if (!selectedTable) return;
    if (!confirm(i18n.t('admin:database_structure_page.confirm_delete_column', { columnName })))
      return;
    dropColumnMutation.mutate({
      tableName: selectedTable.table_name,
      columnName,
    });
  };
  const filteredTables = tables.filter((table) =>
    table.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const getDataTypeDisplay = (col: ColumnInfo) => {
    let type = col.data_type.toUpperCase();
    if (col.character_maximum_length) {
      type = `VARCHAR(${col.character_maximum_length})`;
    } else if (col.numeric_precision && col.numeric_scale) {
      type = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`;
    } else if (col.numeric_precision) {
      type = `NUMERIC(${col.numeric_precision})`;
    }
    return type;
  };
  const changeTypeLabels: Record<string, string> = {
    add_column: i18n.t('admin.database_structure_page.add_column'),
    modify_column: i18n.t('admin.database_structure_page.modify'),
    drop_column: i18n.t('admin.database_structure_page.delete'),
  };
  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'add_column':
        return { bgcolor: 'success.lighter', color: 'success.700' };
      case 'drop_column':
        return { bgcolor: 'error.lighter', color: 'error.darker' };
      default:
        return { bgcolor: 'warning.light', color: 'warning.700' };
    }
  };
  return (
    <PageContainer
      title={i18n.t('admin.database_structure_page.manage')}
      subtitle={i18n.t('admin.database_structure_page.manage_modify_delete')}
      maxWidth='xl'
      headerProps={{
        backButton: {
          onClick: () => navigate(DASHBOARD_PATHS.dashboard),
        },
      }}
    >
      <Grid
        container
        spacing={3}
      >
        {/* 左侧表列表 */}
        <Grid
          item
          xs={12}
          md={3}
          lg={2.4}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              position: { md: 'sticky' },
              top: { md: 16 },
            }}
          >
            <TextField
              fullWidth
              size='small'
              placeholder={i18n.t('admin.database_structure_page.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search
                        size={16}
                        color='grey.400'
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: 600,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: 6,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'grey.400',
                    borderRadius: 3,
                  },
                }}
              >
                <Stack spacing={0.5}>
                  {filteredTables.map((table) => {
                    const isSelected = selectedTable?.table_name === table.table_name;
                    return (
                      <Box
                        key={table.table_name}
                        onClick={() => {
                          setActiveTab('structure');
                          setSelectedTable({
                            table_name: table.table_name,
                            schema_name: 'public',
                            columns: [],
                          });
                        }}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.dark' : 'transparent',
                          bgcolor: isSelected ? 'primary.light' : 'transparent',
                          '&:hover': {
                            bgcolor: isSelected ? 'primary.light' : 'grey.100',
                          },
                        }}
                      >
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Table
                            size={16}
                            color={isSelected ? 'primary.dark' : 'grey.400'}
                          />
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? 'primary.dark' : 'text.primary',
                              wordBreak: 'break-all',
                            }}
                          >
                            {table.table_name}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
        {/* 右侧详情区 */}
        <Grid
          item
          xs={12}
          md={9}
          lg={9.6}
        >
          {selectedTable ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              {/* Tab 导航 */}
              <Box
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  px: 3,
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  sx={{ minHeight: 48 }}
                >
                  <Tab
                    value='structure'
                    label={i18n.t('admin.database_structure_page.tab_structure')}
                    sx={{ minHeight: 48, fontWeight: 500 }}
                  />
                  <Tab
                    value='changes'
                    label={i18n.t('admin.database_structure_page.tab_changes')}
                    sx={{ minHeight: 48, fontWeight: 500 }}
                  />
                </Tabs>
              </Box>
              {activeTab === 'structure' ? (
                <Box>
                  {/* 表头信息 */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant='h6'
                        sx={{
                          ...{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          },
                          fontWeight: 600,
                        }}
                      >
                        {selectedTable.table_name}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mt: 0.5 }}
                      >
                        {i18n.t('admin:database_structure_page.columns_count', {
                          count: selectedTable.columns.length,
                        })}{' '}
                        |{' '}
                        {i18n.t('admin:database_structure_page.rows_count', {
                          count: selectedTable.row_count?.toLocaleString() || '-',
                        })}
                      </Typography>
                    </Box>
                    <Button
                      variant='contained'
                      size='small'
                      startIcon={<Plus size={16} />}
                      onClick={() => setShowAddColumnModal(true)}
                      sx={{
                        bgcolor: 'primary.dark',
                        '&:hover': { bgcolor: 'primary.dark' },
                        textTransform: 'none',
                        borderRadius: 1.5,
                      }}
                    >
                      {i18n.t('admin.database_structure_page.add_column')}
                    </Button>
                  </Box>
                  {/* 字段列表 */}
                  <Box sx={{ p: 2 }}>
                    {detailLoading ? (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          py: 6,
                        }}
                      >
                        <CircularProgress size={28} />
                      </Box>
                    ) : (
                      <TableContainer>
                        <MuiTable size='small'>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                #
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {i18n.t('admin.database_structure_page.column_name')}
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {i18n.t('admin.database_structure_page.column_type')}
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {i18n.t('admin.database_structure_page.nullable')}
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {i18n.t('admin.database_structure_page.default_value')}
                              </TableCell>
                              <TableCell
                                align='right'
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {i18n.t('admin.database_structure_page.action')}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedTable.columns.map((col) => (
                              <TableRow
                                key={col.column_name}
                                sx={{
                                  '&:hover': { bgcolor: 'grey.50' },
                                }}
                              >
                                <TableCell
                                  sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {col.ordinal_position}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  {col.column_name}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                  }}
                                >
                                  {getDataTypeDisplay(col)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                                    size='small'
                                    sx={{
                                      bgcolor:
                                        col.is_nullable === 'YES'
                                          ? 'warning.light'
                                          : 'success.lighter',
                                      color:
                                        col.is_nullable === 'YES' ? 'warning.700' : 'success.700',
                                      fontWeight: 500,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                  }}
                                >
                                  {col.column_default || '-'}
                                </TableCell>
                                <TableCell align='right'>
                                  <Tooltip title={i18n.t('admin.database_structure_page.delete')}>
                                    <IconButton
                                      size='small'
                                      color='error'
                                      onClick={() => handleDropColumn(col.column_name)}
                                      sx={{
                                        '&:hover': { bgcolor: 'error.lighter' },
                                      }}
                                      aria-label={i18n.t(
                                        'admin.database_structure_page.delete_action'
                                      )}
                                    >
                                      <Trash2 size={16} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </MuiTable>
                      </TableContainer>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2 }}>
                  {dbChanges.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        py: 8,
                      }}
                    >
                      <Clock
                        size={48}
                        color='grey.400'
                      />
                      <Typography
                        color='text.secondary'
                        sx={{ mt: 2 }}
                      >
                        {i18n.t('admin.database_structure_page.no_changes')}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <MuiTable size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                              }}
                            >
                              {i18n.t('admin.database_structure_page.col_time')}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                              }}
                            >
                              {i18n.t('admin.database_structure_page.column_type')}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                              }}
                            >
                              {i18n.t('admin.database_structure_page.col_table_name')}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                              }}
                            >
                              {i18n.t('admin.database_structure_page.col_field')}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                              }}
                            >
                              SQL
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dbChanges.map((change) => {
                            const style = getChangeTypeColor(change.change_type);
                            return (
                              <TableRow
                                key={change.id}
                                sx={{
                                  '&:hover': { bgcolor: 'grey.50' },
                                }}
                              >
                                <TableCell
                                  sx={{
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                  }}
                                >
                                  {new Date(change.executed_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      changeTypeLabels[change.change_type] || change.change_type
                                    }
                                    size='small'
                                    sx={{
                                      bgcolor: style.bgcolor,
                                      color: style.color,
                                      fontWeight: 500,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  {change.table_name}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                  }}
                                >
                                  {change.column_name || '-'}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontSize: '0.875rem',
                                    color: 'text.secondary',
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    maxWidth: 320,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {change.sql_statement}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </MuiTable>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                p: 8,
                textAlign: 'center',
              }}
            >
              <Database
                size={64}
                color='grey.400'
                style={{ marginBottom: 16 }}
              />
              <Typography
                variant='h6'
                sx={{ ...{ mb: 1 }, fontWeight: 500 }}
              >
                {i18n.t('admin.database_structure_page.select_table')}
              </Typography>
              <Typography color='text.secondary'>
                {i18n.t('admin.database_structure_page.select_table_hint')}
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
      {/* 添加字段对话框 */}
      <Dialog
        open={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {i18n.t('admin.database_structure_page.add_new_column')}
        </DialogTitle>
        <DialogContent>
          <Stack
            spacing={2.5}
            sx={{ pt: 1 }}
          >
            <TextField
              label={i18n.t('admin.database_structure_page.column_name')}
              required
              fullWidth
              size='small'
              value={newColumn.column_name}
              onChange={(e) => setNewColumn({ ...newColumn, column_name: e.target.value })}
              placeholder={i18n.t('admin.database_structure_page.new_field')}
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>{i18n.t('admin.database_structure_page.type')}</InputLabel>
              <Select
                value={newColumn.data_type}
                label={i18n.t('admin.database_structure_page.type')}
                onChange={(e) => setNewColumn({ ...newColumn, data_type: e.target.value })}
              >
                <MenuItem value='VARCHAR'>VARCHAR</MenuItem>
                <MenuItem value='TEXT'>TEXT</MenuItem>
                <MenuItem value='INTEGER'>INTEGER</MenuItem>
                <MenuItem value='BIGINT'>BIGINT</MenuItem>
                <MenuItem value='NUMERIC'>NUMERIC</MenuItem>
                <MenuItem value='BOOLEAN'>BOOLEAN</MenuItem>
                <MenuItem value='DATE'>DATE</MenuItem>
                <MenuItem value='TIMESTAMP'>TIMESTAMP</MenuItem>
                <MenuItem value='TIMESTAMPTZ'>TIMESTAMPTZ</MenuItem>
                <MenuItem value='UUID'>UUID</MenuItem>
                <MenuItem value='JSONB'>JSONB</MenuItem>
              </Select>
            </FormControl>
            {newColumn.data_type === 'VARCHAR' && (
              <TextField
                label={i18n.t('admin.database_structure_page.max_length')}
                type='number'
                fullWidth
                size='small'
                value={newColumn.max_length || 255}
                onChange={(e) =>
                  setNewColumn({
                    ...newColumn,
                    max_length: parseInt(e.target.value),
                  })
                }
              />
            )}
            <FormControlLabel
              control={
                <MuiCheckbox
                  checked={newColumn.is_nullable}
                  onChange={(e) =>
                    setNewColumn({
                      ...newColumn,
                      is_nullable: e.target.checked,
                    })
                  }
                />
              }
              label={i18n.t('admin.database_structure_page.null')}
            />
            <TextField
              label={i18n.t('admin.database_structure_page.default_value')}
              fullWidth
              size='small'
              value={newColumn.default_value || ''}
              onChange={(e) => setNewColumn({ ...newColumn, default_value: e.target.value })}
              placeholder={i18n.t('admin.database_structure_page.active_now')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowAddColumnModal(false)}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'border.default' },
            }}
          >
            {i18n.t('admin.database_structure_page.cancel')}
          </Button>
          <Button
            variant='contained'
            onClick={handlePreviewAddColumn}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.dark',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {i18n.t('admin.database_structure_page.preview_sql')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* SQL 预览对话框 */}
      <Dialog
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Eye size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('admin.database_structure_page.sql_preview')}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {sqlPreview?.warning && (
            <Alert
              severity='warning'
              icon={<AlertTriangle size={20} />}
              sx={{ mb: 2 }}
            >
              {sqlPreview.warning}
            </Alert>
          )}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'grey.900',
              p: 2,
              borderRadius: 1.5,
              mb: 2,
              overflow: 'auto',
              maxHeight: 320,
            }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <FileCode
                size={16}
                color='success.400'
                style={{ marginTop: 2 }}
              />
              <Box
                component='pre'
                sx={{
                  m: 0,
                  fontSize: '0.875rem',
                  color: 'success.400',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  flex: 1,
                }}
              >
                {sqlPreview?.sql}
              </Box>
            </Stack>
          </Paper>
          <Alert
            severity='info'
            sx={{ mb: 1 }}
          >
            {i18n.t('admin.database_structure_page.execute_confirm')}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowPreviewModal(false)}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'border.default' },
            }}
          >
            {i18n.t('admin.database_structure_page.cancel')}
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleExecuteAddColumn}
            startIcon={<CheckCircle size={16} />}
            sx={{
              textTransform: 'none',
              bgcolor: 'error.dark',
              '&:hover': { bgcolor: 'error.darker' },
            }}
          >
            {i18n.t('admin.database_structure_page.confirm_execute')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* 通知 Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification?.type || 'info'}
          variant='filled'
          sx={{ borderRadius: 1.5 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};
export default DatabaseStructurePage;
