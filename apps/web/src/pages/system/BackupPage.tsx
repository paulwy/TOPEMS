import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Upload,
  Trash2,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  Eye,
  Package,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/date';

import { QUERY_KEYS } from '@/lib/reactQuery';

type BackupRecord = {
  id: string;
  backup_type: string;
  status: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  backup_id?: string;
  backup_name?: string;
  duration_seconds?: number;
  file_path?: string;
  error_message?: string;
};

const BackupPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);

  const [backupName, setBackupName] = useState('');
  const [backupType, setBackupType] = useState<'full' | 'incremental' | 'schema'>('full');
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const {
    data: backups = [],
    isPending,
    error,
    refetch,
  } = useQuery<BackupRecord[]>({
    queryKey: [QUERY_KEYS.ADMIN.BACKUP, page + 1, rowsPerPage],
    queryFn: async () => {
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return {};
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '备份创建成功',
        type: 'success',
      });
      setShowCreateModal(false);
      setBackupName('');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN.BACKUP] ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err) => {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '创建备份失败'),
        type: 'error',
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (_backupId: string) => {
      return {};
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '备份恢复成功',
        type: 'success',
      });
      setShowRestoreModal(false);
      setSelectedBackup(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN.BACKUP] ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err) => {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '恢复备份失败'),
        type: 'error',
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (_backupId: string) => {
      return {};
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '备份删除成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN.BACKUP] ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err) => {
      addNotification({
        title: '错误',
        message: extractErrorMessage(err, '删除备份失败'),
        type: 'error',
      });
    },
  });

  const handleCreateBackup = useCallback(() => {
    createBackupMutation.mutate();
  }, [createBackupMutation]);

  const handleRestoreBackup = useCallback(() => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup.id);
    }
  }, [selectedBackup, restoreBackupMutation]);

  const handleDeleteBackup = useCallback(
    (backupId: string) => {
      openConfirmDialog({
        title: '确认删除',
        message: '确定要删除这个备份吗？此操作不可恢复。',
        danger: true,
        onConfirm: () => {
          deleteBackupMutation.mutate(backupId);
        },
      });
    },
    [deleteBackupMutation, openConfirmDialog]
  );

  const handleOpenRestoreModal = useCallback((backup: BackupRecord) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  }, []);

  const handleOpenDetailModal = useCallback((backup: BackupRecord) => {
    setSelectedBackup(backup);
    setShowDetailModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowCreateModal(false);
    setShowRestoreModal(false);
    setShowDetailModal(false);
    setSelectedBackup(null);
  }, []);

  const getBackupTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full: '完整备份',
      incremental: '增量备份',
      schema: '结构备份',
    };
    return labels[type] || type;
  };

  const getBackupTypeChip = (type: string) => {
    const chips: Record<string, { color: 'primary' | 'secondary' | 'default'; label: string }> = {
      full: { color: 'primary', label: '完整' },
      incremental: { color: 'secondary', label: '增量' },
      schema: { color: 'default', label: '结构' },
    };
    const chip = chips[type];
    return (
      <Chip
        size='small'
        label={chip?.label || type}
        color={chip?.color}
      />
    );
  };

  const getStatusChip = (status: string) => {
    const chips: Record<
      string,
      { color: 'success' | 'error' | 'warning' | 'default'; label: string }
    > = {
      completed: { color: 'success', label: '已完成' },
      failed: { color: 'error', label: '失败' },
      in_progress: { color: 'warning', label: '进行中' },
      pending: { color: 'default', label: '待处理' },
    };
    const chip = chips[status];
    return (
      <Chip
        size='small'
        label={chip?.label || status}
        color={chip?.color}
      />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const displayBackups = backups || [];

  return (
    <PageContainer title='数据备份与恢复'>
      <Box sx={{ mb: 3 }}>
        <Button
          variant='contained'
          startIcon={<Package />}
          onClick={() => setShowCreateModal(true)}
          disabled={createBackupMutation.isPending}
        >
          {createBackupMutation.isPending ? (
            <CircularProgress
              size={18}
              sx={{ mr: 1 }}
            />
          ) : null}
          创建备份
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>备份名称</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>大小</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>耗时</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <Alert severity='error'>
                        {extractErrorMessage(error, '加载备份列表失败')}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : displayBackups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <Typography color='text.secondary'>暂无备份记录</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayBackups.map((backup) => (
                    <TableRow key={backup.backup_id}>
                      <TableCell>
                        <Tooltip title={backup.backup_name}>
                          <Typography noWrap>{backup.backup_name}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{getBackupTypeChip(backup.backup_type)}</TableCell>
                      <TableCell>{getStatusChip(backup.status)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileText size={14} />
                          <Typography>{formatFileSize(backup.file_size || 0)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar size={14} />
                          <Typography>{formatDateTime(backup.created_at)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Clock size={14} />
                          <Typography>{backup.duration_seconds}秒</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title='查看详情'>
                            <IconButton
                              size='small'
                              onClick={() => handleOpenDetailModal(backup)}
                              aria-label='查看'
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {backup.status === 'completed' && (
                            <Tooltip title='恢复备份'>
                              <IconButton
                                size='small'
                                onClick={() => handleOpenRestoreModal(backup)}
                                disabled={restoreBackupMutation.isPending}
                                aria-label='上传'
                              >
                                <Upload size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {backup.status === 'completed' && (
                            <Tooltip title='下载备份'>
                              <IconButton
                                size='small'
                                aria-label='下载'
                              >
                                <Download size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title='删除备份'>
                            <IconButton
                              size='small'
                              onClick={() => handleDeleteBackup(backup.id)}
                              disabled={deleteBackupMutation.isPending}
                              sx={{ color: 'error.main' }}
                              aria-label='删除'
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
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={showCreateModal}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建备份</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label='备份名称'
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder='例如：weekly-backup-20240115'
              margin='normal'
            />
            <FormControl
              fullWidth
              margin='normal'
            >
              <InputLabel>备份类型</InputLabel>
              <Select
                value={backupType}
                onChange={(e) => setBackupType(e.target.value as 'full' | 'incremental' | 'schema')}
                label='备份类型'
              >
                <MenuItem value='full'>完整备份 - 备份所有数据</MenuItem>
                <MenuItem value='incremental'>增量备份 - 仅备份变更数据</MenuItem>
                <MenuItem value='schema'>结构备份 - 仅备份数据库结构</MenuItem>
              </Select>
            </FormControl>
            <Alert
              severity='info'
              sx={{ mt: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertCircle size={16} />
                <Typography variant='body2'>
                  备份过程中请保持页面打开，请勿刷新或关闭浏览器。
                </Typography>
              </Box>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? (
              <CircularProgress
                size={18}
                sx={{ mr: 1 }}
              />
            ) : null}
            开始备份
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRestoreModal}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>恢复备份</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                即将恢复以下备份：
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography>{selectedBackup.backup_name}</Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  类型：{getBackupTypeLabel(selectedBackup.backup_type)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  大小：{formatFileSize(selectedBackup.file_size || 0)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  创建时间：{formatDateTime(selectedBackup.created_at)}
                </Typography>
              </Box>
              <Alert
                severity='warning'
                sx={{ mt: 3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AlertCircle size={16} />
                  <Typography variant='body2'>
                    恢复备份将覆盖当前数据，请确保已备份最新数据。此操作不可撤销！
                  </Typography>
                </Box>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>取消</Button>
          <Button
            variant='contained'
            color='warning'
            onClick={handleRestoreBackup}
            disabled={restoreBackupMutation.isPending}
          >
            {restoreBackupMutation.isPending ? (
              <CircularProgress
                size={18}
                sx={{ mr: 1 }}
              />
            ) : null}
            确认恢复
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={handleCloseModal}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>备份详情</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    备份名称
                  </Typography>
                  <Typography>{selectedBackup.backup_name}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    备份类型
                  </Typography>
                  <Typography>{getBackupTypeLabel(selectedBackup.backup_type)}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    状态
                  </Typography>
                  {getStatusChip(selectedBackup.status)}
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    文件大小
                  </Typography>
                  <Typography>{formatFileSize(selectedBackup.file_size || 0)}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    创建时间
                  </Typography>
                  <Typography>{formatDateTime(selectedBackup.created_at)}</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    耗时
                  </Typography>
                  <Typography>{selectedBackup.duration_seconds}秒</Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    备份ID
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {selectedBackup.backup_id}
                  </Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    文件路径
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {selectedBackup.file_path || '-'}
                  </Typography>
                </Box>
                {selectedBackup.error_message && (
                  <Box sx={{ width: '100%' }}>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                      color='error'
                    >
                      错误信息
                    </Typography>
                    <Typography
                      variant='body2'
                      color='error'
                    >
                      {selectedBackup.error_message}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>关闭</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default BackupPage;
