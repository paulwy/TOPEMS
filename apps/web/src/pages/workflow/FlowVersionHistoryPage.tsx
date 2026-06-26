import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  User,
  CheckCircle,
  RotateCcw,
  Trash2,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { BackButton } from '@/components/common';
import type { Workflow, WorkflowVersion } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';

const FlowVersionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const addNotification = useAppStore((state) => state.addNotification);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);
  const [createForm, setCreateForm] = useState({
    version: '',
    change_description: '',
  });
  const [rollbackForm, setRollbackForm] = useState({
    reason: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const workflowResponse = await workflowApi.getWorkflow(id);
      if (workflowResponse.success && workflowResponse.data) {
        setWorkflow(workflowResponse.data as any);
      }

      const versionsResponse = await workflowApi.getVersions(id);
      if (versionsResponse.success && versionsResponse.data) {
        const data = versionsResponse.data as any;
        const versionList = Array.isArray(data) ? data : data.items || [];
        setVersions(versionList);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据失败:', err);
      addNotification({
        title: '错误',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!id || !createForm.version.trim()) {
      addNotification({ title: '提示', message: '请输入版本号', type: 'info' });
      return;
    }

    try {
      setActionLoading(true);

      const workflow = await workflowApi.getWorkflow(id);
      if (!workflow.success || !workflow.data) {
        addNotification({
          title: '错误',
          message: '获取工作流失败',
          type: 'error',
        });
        return;
      }

      const workflowData = workflow.data as any;
      const response = await workflowApi.createVersion(id, {
        version: createForm.version,
        definition: workflowData.definition || {},
        change_description: createForm.change_description,
        created_by: 'current-user',
      });

      if (response.success) {
        addNotification({
          title: '成功',
          message: '版本创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setCreateForm({ version: '', change_description: '' });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('创建版本失败:', err);
      addNotification({
        title: '错误',
        message: '创建版本失败',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateVersion = async (version: WorkflowVersion) => {
    if (!id) return;

    try {
      setActionLoading(true);

      const response = await workflowApi.activateVersion(id, version.id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '版本激活成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '激活失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('激活版本失败:', err);
      addNotification({
        title: '错误',
        message: '激活版本失败',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!id || !selectedVersion) return;

    try {
      setActionLoading(true);

      const response = await workflowApi.rollbackVersion(id, {
        to_version: selectedVersion.version,
        reason: rollbackForm.reason,
        rolled_back_by: 'current-user',
      });

      if (response.success) {
        addNotification({
          title: '成功',
          message: '回滚成功',
          type: 'success',
        });
        setShowRollbackModal(false);
        setSelectedVersion(null);
        setRollbackForm({ reason: '' });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '回滚失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('回滚失败:', err);
      addNotification({ title: '错误', message: '回滚失败', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVersion = async (version: WorkflowVersion) => {
    if (!id || version.is_active) {
      addNotification({
        title: '提示',
        message: '无法删除当前激活的版本',
        type: 'info',
      });
      return;
    }

    if (!confirm('确定要删除这个版本吗？')) return;

    try {
      setActionLoading(true);

      const response = await workflowApi.deleteVersion(id, version.id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '版本删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('删除版本失败:', err);
      addNotification({
        title: '错误',
        message: '删除版本失败',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompare = (version1: string, version2: string) => {
    navigate(`/flow/definitions`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2
          size={32}
          className='animate-spin'
          style={{ color: 'secondary.dark' }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction='row'
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <BackButton href='/flow/definitions' />
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'secondary.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GitBranch
                  size={24}
                  style={{ color: 'secondary.dark' }}
                />
              </Box>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  版本历史
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {workflow?.name}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant='contained'
              onClick={() => setShowCreateModal(true)}
              sx={{ bgcolor: 'secondary.main' }}
              startIcon={<Plus size={20} />}
            >
              创建版本
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Version Timeline */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            版本列表
          </Typography>

          {versions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <GitBranch
                size={64}
                style={{ color: 'grey.300', margin: '0 auto', marginBottom: 16 }}
              />
              <Typography sx={{ color: 'grey.500' }}>暂无版本历史</Typography>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant='contained'
                sx={{ mt: 2, bgcolor: 'secondary.main' }}
              >
                创建第一个版本
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {versions.map((version, index) => (
                <Box
                  key={version.id}
                  sx={{
                    border: 1,
                    borderColor: version.is_active ? 'secondary.main' : 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: version.is_active ? 'secondary.50' : 'transparent',
                  }}
                >
                  <Stack
                    direction='row'
                    sx={{
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Stack
                      direction='row'
                      spacing={2}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: version.is_active ? 'secondary.main' : 'grey.100',
                          color: version.is_active ? 'white' : 'grey.600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {version.is_active ? (
                          <CheckCircle size={20} />
                        ) : (
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 700 }}
                          >
                            {index + 1}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center', mb: 0.5 }}
                        >
                          <Typography
                            variant='h6'
                            sx={{ fontWeight: 600 }}
                          >
                            v{version.version}
                          </Typography>
                          {version.is_active && (
                            <Chip
                              label='当前版本'
                              size='small'
                              sx={{ bgcolor: 'secondary.main', color: 'white' }}
                            />
                          )}
                        </Stack>
                        {version.change_description && (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mb: 1 }}
                          >
                            {version.change_description}
                          </Typography>
                        )}
                        <Stack
                          direction='row'
                          spacing={2}
                        >
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center' }}
                          >
                            <User size={14} />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {version.created_by || '系统'}
                            </Typography>
                          </Stack>
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center' }}
                          >
                            <Calendar size={14} />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {new Date(version.created_at).toLocaleString()}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      {!version.is_active && (
                        <>
                          <Tooltip title='回滚到此版本'>
                            <IconButton
                              size='small'
                              onClick={() => {
                                setSelectedVersion(version);
                                setShowRollbackModal(true);
                              }}
                              sx={{ color: 'warning.main' }}
                            >
                              <RotateCcw size={20} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='删除版本'>
                            <IconButton
                              size='small'
                              onClick={() => handleDeleteVersion(version)}
                              sx={{ color: 'error.main' }}
                            >
                              <Trash2 size={20} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Button
                        size='small'
                        onClick={() => handleActivateVersion(version)}
                        disabled={version.is_active}
                        variant={version.is_active ? 'outlined' : 'contained'}
                        sx={version.is_active ? {} : { bgcolor: 'secondary.main' }}
                      >
                        {version.is_active ? '已激活' : '激活'}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Create Version Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <DialogTitle>创建新版本</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            创建一个新的工作流版本
          </Typography>
          <Stack spacing={2}>
            <TextField
              size='small'
              label='版本号 *'
              value={createForm.version}
              onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
              placeholder='例如: 1.0.1'
              fullWidth
            />
            <TextField
              size='small'
              label='变更说明'
              value={createForm.change_description}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  change_description: e.target.value,
                })
              }
              placeholder='描述本次变更内容'
              multiline
              rows={4}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateVersion}
            disabled={actionLoading || !createForm.version.trim()}
            sx={{ bgcolor: 'secondary.main' }}
            startIcon={
              actionLoading ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : undefined
            }
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Modal */}
      <Dialog
        open={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
      >
        <DialogTitle>回滚到 v{selectedVersion?.version}</DialogTitle>
        <DialogContent>
          {selectedVersion && (
            <>
              <Typography
                variant='body2'
                sx={{ mb: 1 }}
              >
                确定要回滚到版本 <strong>v{selectedVersion.version}</strong> 吗？
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                当前工作流将被更新为该版本的内容。
              </Typography>
            </>
          )}
          <TextField
            size='small'
            label='回滚原因'
            value={rollbackForm.reason}
            onChange={(e) => setRollbackForm({ ...rollbackForm, reason: e.target.value })}
            placeholder='可选：输入回滚原因'
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowRollbackModal(false);
              setSelectedVersion(null);
              setRollbackForm({ reason: '' });
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleRollback}
            disabled={actionLoading}
            sx={{ bgcolor: 'warning.main' }}
            startIcon={
              actionLoading ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : undefined
            }
          >
            确认回滚
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowVersionHistoryPage;
