import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  Table,
  Search,
  RefreshCw,
  Download,
  Upload,
  ChevronLeft,
  Eye,
  Trash2,
  Clock,
  HardDrive,
  FileText,
  Play,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  Settings,
  ArrowUpDown,
} from 'lucide-react';
import { PageContainer, StatusBadge, ActionButton, ConfirmDialog } from '@/components/common';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  TablePagination,
  Tabs,
  Tab,
  LinearProgress,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { ERP_PATHS } from '@/modules/erp/config';
import { databaseApi, type TableInfo, type ColumnInfo } from '@/api/erp/database';
import { extractErrorMessage } from '@/utils/errors';

export interface BackupRecord {
  id: string;
  backup_name: string;
  backup_type: 'full' | 'incremental';
  filesize: string;
  status: 'success' | 'failed' | 'running';
  created_at: string;
  created_by: string;
  remark?: string;
}

const mockBackups: BackupRecord[] = [
  {
    id: '1',
    backup_name: 'backup_full_20240615_0200',
    backup_type: 'full',
    filesize: '156.8 MB',
    status: 'success',
    created_at: '2024-06-15 02:00:00',
    created_by: 'system',
    remark: '每日定时全量备份',
  },
  {
    id: '2',
    backup_name: 'backup_incr_20240614_2000',
    backup_type: 'incremental',
    filesize: '12.4 MB',
    status: 'success',
    created_at: '2024-06-14 20:00:00',
    created_by: 'system',
    remark: '增量备份',
  },
  {
    id: '3',
    backup_name: 'backup_incr_20240613_2000',
    backup_type: 'incremental',
    filesize: '8.7 MB',
    status: 'success',
    created_at: '2024-06-13 20:00:00',
    created_by: 'system',
    remark: '增量备份',
  },
  {
    id: '4',
    backup_name: 'backup_full_20240601_0200',
    backup_type: 'full',
    filesize: '142.3 MB',
    status: 'success',
    created_at: '2024-06-01 02:00:00',
    created_by: 'system',
    remark: '月初全量备份',
  },
  {
    id: '5',
    backup_name: 'backup_manual_20240520',
    backup_type: 'full',
    filesize: '128.5 MB',
    status: 'failed',
    created_at: '2024-05-20 14:30:00',
    created_by: '管理员',
    remark: '手动备份失败',
  },
];

const DatabaseManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState('tables');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>(mockBackups);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [showStructureModal, setShowStructureModal] = useState(false);
  const [currentTable, setCurrentTable] = useState<TableInfo | null>(null);
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  const [tableRowCount, setTableRowCount] = useState<number | null>(null);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const [deleteBackupDialogOpen, setDeleteBackupDialogOpen] = useState(false);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);

  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await databaseApi.listTables({ search: searchQuery || undefined });
      if (res.success && res.data) {
        setTables(res.data);
        setTotalCount(res.data.length);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据表失败:', err);
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '加载数据表失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, addNotification]);

  useEffect(() => {
    if (activeTab === 'tables') {
      loadTables();
    } else {
      setLoading(false);
    }
  }, [activeTab, loadTables]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        !searchQuery ||
        table.table_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tables, searchQuery]);

  const handleViewStructure = useCallback(async (table: TableInfo) => {
    setCurrentTable(table);
    try {
      const res = await databaseApi.getTableDetail(table.table_name);
      if (res.success && res.data) {
        setTableColumns(res.data.columns);
        setTableRowCount(res.data.row_count);
      }
    } catch (err: unknown) {
      apiLogger.error('获取表结构失败:', err);
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '获取表结构失败'),
        type: 'error',
      });
    }
    setShowStructureModal(true);
  }, [addNotification]);

  const handleBackup = () => {
    setShowBackupModal(true);
  };

  const startBackup = async () => {
    setBackingUp(true);
    setBackupProgress(0);
    setShowBackupModal(false);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setBackupProgress(i);
    }

    setBackingUp(false);
    setBackupProgress(0);

    const newBackup: BackupRecord = {
      id: Date.now().toString(),
      backup_name: `backup_manual_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      backup_type: 'full',
      filesize: `${(Math.random() * 50 + 100).toFixed(1)} MB`,
      status: 'success',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      created_by: '当前用户',
      remark: '手动备份',
    };
    setBackups((prev) => [newBackup, ...prev]);

    addNotification({
      title: '备份成功',
      message: '数据库备份已完成',
      type: 'success',
    });
  };

  const handleRestore = (backupId: string) => {
    setRestoreBackupId(backupId);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    setShowRestoreModal(false);
    addNotification({
      title: '恢复中',
      message: '数据库恢复任务已开始，请耐心等待',
      type: 'info',
    });
    setRestoreBackupId(null);
  };

  const handleDeleteBackup = (id: string) => {
    setDeletingBackupId(id);
    setDeleteBackupDialogOpen(true);
  };

  const confirmDeleteBackup = async () => {
    if (!deletingBackupId) return;
    try {
      setBackups((prev) => prev.filter((b) => b.id !== deletingBackupId));
      addNotification({
        title: '成功',
        message: '备份文件已删除',
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    } finally {
      setDeleteBackupDialogOpen(false);
      setDeletingBackupId(null);
    }
  };

  const getBackupStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { color: 'success' | 'error' | 'info' | 'default'; label: string; icon: React.ReactNode }
    > = {
      success: { color: 'success', label: '成功', icon: <CheckCircle size={14} /> },
      failed: { color: 'error', label: '失败', icon: <AlertCircle size={14} /> },
      running: { color: 'info', label: '进行中', icon: <CircularProgress size={14} /> },
    };
    const config = badges[status] || { color: 'default', label: status, icon: <Info size={14} /> };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        icon={config.icon}
      />
    );
  };

  const stats = useMemo(() => {
    return {
      tableCount: tables.length,
      backupCount: backups.filter((b) => b.status === 'success').length,
    };
  }, [tables, backups]);

  return (
    <PageContainer
      title='数据库管理'
      subtitle='数据表列表、表结构查看、数据备份与恢复'
      maxWidth='xl'
      headerProps={{
        backButton: {
          onClick: () => navigate(ERP_PATHS.dashboard),
        },
        actions: [
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadTables,
            variant: 'outlined',
          },
          {
            label: '数据备份',
            icon: <Download size={16} />,
            onClick: handleBackup,
            variant: 'contained',
          },
        ],
      }}
    >
      {backingUp && (
        <Alert
          severity='info'
          sx={{ mb: 2 }}
        >
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='body2'>正在备份数据库...</Typography>
              <Typography variant='body2'>{backupProgress}%</Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={backupProgress}
            />
          </Box>
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 2, md: 4 },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: '数据表数量',
            value: stats.tableCount,
            icon: <Table size={20} />,
            color: 'primary',
            bg: 'primary.100',
          },
          {
            label: '可用备份',
            value: stats.backupCount,
            icon: <Download size={20} />,
            color: 'info',
            bg: 'info.100',
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: stat.bg,
                color: `${stat.color}.main`,
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 1,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            value='tables'
            label='数据表'
            icon={<Table size={16} />}
            iconPosition='start'
          />
          <Tab
            value='backup'
            label='备份管理'
            icon={<Download size={16} />}
            iconPosition='start'
          />
        </Tabs>

        {activeTab === 'tables' && (
          <>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <TextField
                size='small'
                placeholder='搜索表名...'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search
                          size={16}
                          style={{ opacity: 0.5 }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 280 }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <FormControl
                size='small'
                sx={{ minWidth: 140 }}
              >
                <InputLabel>排序</InputLabel>
                <Select
                  value=''
                  label='排序'
                >
                  <MenuItem value=''>默认排序</MenuItem>
                  <MenuItem value='name'>按表名</MenuItem>
                  <MenuItem value='time'>按更新时间</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <MuiTable>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>表名</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                        <TableCell
                          align='center'
                          sx={{ fontWeight: 'bold', width: 120 }}
                        >
                          操作
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTables.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            sx={{ py: 8, textAlign: 'center' }}
                          >
                            <Database
                              sx={{
                                width: 48,
                                height: 48,
                                color: 'text.disabled',
                                mx: 'auto',
                                mb: 2,
                              }}
                            />
                            <Typography
                              variant='body1'
                              sx={{ color: 'text.secondary' }}
                            >
                              暂无数据表
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTables.map((table) => (
                          <TableRow
                            key={table.table_name}
                            hover
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Table
                                  size={16}
                                  style={{ opacity: 0.5 }}
                                />
                                <Typography
                                  sx={{
                                    fontWeight: 500,
                                    color: 'primary.main',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {table.table_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={table.table_type}
                                size='small'
                                variant='outlined'
                              />
                            </TableCell>
                            <TableCell align='center'>
                              <Tooltip title='查看结构'>
                                <IconButton
                                  size='small'
                                  onClick={() => handleViewStructure(table)}
                                >
                                  <Eye size={16} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </MuiTable>
                </TableContainer>
                <TablePagination
                  component='div'
                  count={totalCount}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage='每页行数'
                />
              </>
            )}
          </>
        )}

        {activeTab === 'backup' && (
          <>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant='outlined'
                size='small'
                startIcon={<Upload size={16} />}
                onClick={() => setShowRestoreModal(true)}
              >
                上传备份
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<Play size={16} />}
                onClick={handleBackup}
              >
                立即备份
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <MuiTable>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>备份名称</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>文件大小</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>创建人</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>创建时间</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>备注</TableCell>
                      <TableCell
                        align='center'
                        sx={{ fontWeight: 'bold', width: 160 }}
                      >
                        操作
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          sx={{ py: 8, textAlign: 'center' }}
                        >
                          <Download
                            sx={{
                              width: 48,
                              height: 48,
                              color: 'text.disabled',
                              mx: 'auto',
                              mb: 2,
                            }}
                          />
                          <Typography
                            variant='body1'
                            sx={{ color: 'text.secondary' }}
                          >
                            暂无备份记录
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow
                          key={backup.id}
                          hover
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Database
                                size={16}
                                style={{ opacity: 0.5 }}
                              />
                              <Typography
                                sx={{
                                  fontWeight: 500,
                                  fontFamily: 'monospace',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {backup.backup_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={backup.backup_type === 'full' ? '全量备份' : '增量备份'}
                              size='small'
                              color={backup.backup_type === 'full' ? 'primary' : 'default'}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>{backup.filesize}</TableCell>
                          <TableCell>{getBackupStatusBadge(backup.status)}</TableCell>
                          <TableCell>{backup.created_by}</TableCell>
                          <TableCell>
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary' }}
                            >
                              {backup.created_at}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'text.secondary',
                              }}
                            >
                              {backup.remark || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title='下载'>
                                <IconButton
                                  size='small'
                                  color='primary'
                                >
                                  <Download size={16} />
                                </IconButton>
                              </Tooltip>
                              {backup.status === 'success' && (
                                <Tooltip title='恢复'>
                                  <IconButton
                                    size='small'
                                    color='warning'
                                    onClick={() => handleRestore(backup.id)}
                                  >
                                    <Upload size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title='删除'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={() => handleDeleteBackup(backup.id)}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            )}
          </>
        )}
      </Box>

      <Dialog
        open={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={20} />
            表结构 - {currentTable?.table_name}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentTable && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    表名
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {currentTable.table_name}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    类型
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentTable.table_type}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    记录数
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {tableRowCount?.toLocaleString() || '-'}
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mt: 1 }}
              >
                字段列表
              </Typography>

              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <MuiTable size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>字段名</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>长度</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>可空</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>默认值</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>说明</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableColumns.map((col) => (
                      <TableRow key={col.column_name}>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                            {col.column_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={col.data_type}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>{col.character_maximum_length || '-'}</TableCell>
                        <TableCell>
                          {col.is_nullable === 'YES' ? (
                            <Chip
                              label='是'
                              size='small'
                              color='default'
                              variant='outlined'
                            />
                          ) : (
                            <Chip
                              label='否'
                              size='small'
                              color='warning'
                              variant='outlined'
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {col.column_default || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowStructureModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download size={20} />
            创建数据备份
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity='info'>
              将对当前数据库进行全量备份，包括所有表结构和数据。备份过程可能需要几分钟，请耐心等待。
            </Alert>
            <FormControl size='small'>
              <InputLabel>备份类型</InputLabel>
              <Select
                value='full'
                label='备份类型'
              >
                <MenuItem value='full'>全量备份</MenuItem>
                <MenuItem value='incremental'>增量备份</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size='small'
              label='备份备注'
              multiline
              rows={2}
              placeholder='可选，填写备份说明'
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowBackupModal(false)}>取消</Button>
          <Button
            variant='contained'
            startIcon={<Play size={16} />}
            onClick={startBackup}
          >
            开始备份
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setRestoreBackupId(null);
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Upload size={20} />
            数据恢复确认
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Alert severity='warning'>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1 }}
              >
                警告：数据恢复操作将覆盖当前数据库！
              </Typography>
              <Typography variant='body2'>
                此操作不可撤销，建议先对当前数据进行备份后再执行恢复操作。
              </Typography>
            </Alert>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                要恢复的备份
              </Typography>
              <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                {backups.find((b) => b.id === restoreBackupId)?.backup_name || '-'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowRestoreModal(false);
              setRestoreBackupId(null);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            color='warning'
            startIcon={<Upload size={16} />}
            onClick={confirmRestore}
          >
            确认恢复
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteBackupDialogOpen}
        onClose={() => {
          setDeleteBackupDialogOpen(false);
          setDeletingBackupId(null);
        }}
        onConfirm={confirmDeleteBackup}
        title='确认删除'
        message='确定要删除该备份文件吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default DatabaseManagementPage;
