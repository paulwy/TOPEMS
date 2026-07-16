import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import { logger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { Plus, Edit, Delete, Eye, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';
import {
  approvalConfigApi,
  type ApprovalConfig,
  type ApprovalNode,
  type CreateApprovalConfigRequest,
} from '@/api/finance/approvalConfig';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const priorityOptions = [
  { value: 1, label: '高' },
  { value: 2, label: '中' },
  { value: 3, label: '低' },
];

const approvalTypeOptions = [
  { value: 'single', label: '单人审批' },
  { value: 'multiple', label: '多人审批' },
  { value: 'any', label: '任意一人审批' },
];

const approverTypeOptions = [
  { value: 'role', label: '角色审批' },
  { value: 'user', label: '指定用户' },
];

export const FinanceApprovalConfigPage: React.FC = () => {
  const queryClient = useQueryClient();

  const configsQuery = useQuery<ApprovalConfig[]>({
    queryKey: ['finance-approval-configs'],
    queryFn: async () => {
      const result = await approvalConfigApi.list();
      return result.success && result.data ? result.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const configs = configsQuery.data ?? [];
  const loading = configsQuery.isLoading;

  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApprovalConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<ApprovalConfig | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateApprovalConfigRequest>({
    name: '',
    description: '',
    amountThreshold: 0,
    maxAmount: undefined,
    workflowId: '',
    approvalLevels: 1,
    priority: 2,
    isActive: true,
    nodes: [],
  });

  useEffect(() => {
    if (configsQuery.isError) {
      logger.error('Failed to load approval configs:', configsQuery.error);
    }
  }, [configsQuery.isError, configsQuery.error]);

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      description: '',
      amountThreshold: 0,
      maxAmount: undefined,
      workflowId: '',
      approvalLevels: 1,
      priority: 2,
      isActive: true,
      nodes: [],
    });
    setShowDialog(true);
  };

  const handleEdit = (config: ApprovalConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      amountThreshold: config.amountThreshold,
      maxAmount: config.maxAmount,
      workflowId: config.workflowId || '',
      approvalLevels: config.approvalLevels,
      priority: config.priority,
      isActive: config.isActive,
      nodes: config.nodes || [],
    });
    setShowDialog(true);
  };

  const handleView = (config: ApprovalConfig) => {
    setSelectedConfig(config);
    setShowDetailDialog(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const deleteMutation = useMutation({
    mutationFn: (configId: string) => approvalConfigApi.delete(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-approval-configs'] });
      setConfirmDelete(null);
    },
    onError: (err: unknown) => {
      logger.error('Failed to delete config:', err);
      setConfirmDelete(null);
    },
  });

  const confirmDeleteAction = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete);
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateApprovalConfigRequest) => approvalConfigApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-approval-configs'] });
      setShowDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to save config:', err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: CreateApprovalConfigRequest }) =>
      approvalConfigApi.update(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-approval-configs'] });
      setShowDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to save config:', err);
    },
  });

  const handleSave = () => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addNode = () => {
    const newLevel = (formData.nodes?.length || 0) + 1;
    setFormData({
      ...formData,
      nodes: [
        ...(formData.nodes || []),
        {
          id: '',
          configId: '',
          nodeLevel: newLevel,
          nodeName: `审批节点${newLevel}`,
          approverType: 'role',
          approverRole: '',
          approverUsers: [],
          approvalType: 'single',
          timeoutHours: 48,
          notifyUsers: [],
          conditions: undefined,
          isActive: true,
        },
      ],
    });
  };

  const removeNode = (index: number) => {
    setFormData({
      ...formData,
      nodes: (formData.nodes || []).filter((_, i) => i !== index),
    });
  };

  const updateNode = (
    index: number,
    field: keyof ApprovalNode,
    value: string | number | boolean | string[]
  ) => {
    const nodes = [...(formData.nodes || [])];
    nodes[index] = { ...nodes[index], [field]: value } as ApprovalNode;
    setFormData({ ...formData, nodes });
  };

  return (
    <PageContainer
      title='付款审批配置'
      headerActions={
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={handleCreate}
          disabled={loading}
        >
          新建配置
        </Button>
      }
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction='row'
            spacing={2}
            sx={{ flexWrap: 'wrap', gap: 2 }}
          >
            <Button
              variant='outlined'
              size='small'
              startIcon={<RefreshCw size={16} />}
              onClick={() => configsQuery.refetch()}
              disabled={loading}
            >
              刷新
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>配置名称</TableCell>
                <TableCell align='right'>金额范围</TableCell>
                <TableCell align='center'>审批层级</TableCell>
                <TableCell align='center'>优先级</TableCell>
                <TableCell align='center'>状态</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Stack
                      direction='row'
                      sx={{ alignItems: 'center', gap: 1 }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>{config.name}</Typography>
                      {config.description && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {config.description}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography>
                      ¥{config.amountThreshold.toLocaleString()}
                      {config.maxAmount && <span> ~ ¥{config.maxAmount.toLocaleString()}</span>}
                      {!config.maxAmount && <span> 以上</span>}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>{config.approvalLevels}</TableCell>
                  <TableCell align='center'>
                    {priorityOptions.find((p) => p.value === config.priority)?.label ||
                      config.priority}
                  </TableCell>
                  <TableCell align='center'>
                    <Typography
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        bgcolor: config.isActive ? '#e8f5e9' : '#ffebee',
                        color: config.isActive ? '#2e7d32' : '#c62828',
                      }}
                    >
                      {config.isActive ? '启用' : '禁用'}
                    </Typography>
                  </TableCell>
                  <TableCell align='center'>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <Tooltip title='查看详情'>
                        <IconButton
                          size='small'
                          onClick={() => handleView(config)}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='编辑'>
                        <IconButton
                          size='small'
                          onClick={() => handleEdit(config)}
                        >
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='删除'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(config.id)}
                          disabled={!config.isActive}
                        >
                          <Delete size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align='center'
                  >
                    <Stack
                      direction='column'
                      sx={{ alignItems: 'center', gap: 2, py: 4 }}
                    >
                      <AlertCircle
                        size={48}
                        color='#bdbdbd'
                      />
                      <Typography color='text.secondary'>暂无审批配置</Typography>
                      <Button
                        variant='outlined'
                        onClick={handleCreate}
                      >
                        创建首个配置
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{editingConfig ? '编辑审批配置' : '新建审批配置'}</DialogTitle>
        <DialogContent dividers>
          <Stack
            spacing={3}
            sx={{ mt: 2 }}
          >
            <TextField
              fullWidth
              label='配置名称'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label='配置描述'
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Stack
              direction='row'
              spacing={3}
            >
              <TextField
                label='金额阈值（最低）'
                type='number'
                value={formData.amountThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, amountThreshold: Number(e.target.value) })
                }
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label='金额上限（可选）'
                type='number'
                value={formData.maxAmount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                sx={{ flex: 1 }}
              />
            </Stack>
            <Stack
              direction='row'
              spacing={3}
            >
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>审批层级</InputLabel>
                <Select
                  value={formData.approvalLevels}
                  label='审批层级'
                  onChange={(e) =>
                    setFormData({ ...formData, approvalLevels: e.target.value as number })
                  }
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <MenuItem
                      key={level}
                      value={level}
                    >
                      {level} 级
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={formData.priority}
                  label='优先级'
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as number })}
                >
                  {priorityOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              fullWidth
              label='工作流 ID（可选）'
              value={formData.workflowId}
              onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
              placeholder='关联的工作流引擎流程ID'
            />

            <Box>
              <Stack
                direction='row'
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  审批节点配置
                </Typography>
                <Button
                  size='small'
                  onClick={addNode}
                >
                  + 添加节点
                </Button>
              </Stack>
              {(formData.nodes || []).map((node, index) => (
                <Card
                  key={index}
                  sx={{ mt: 2, p: 2 }}
                >
                  <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
                  >
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                    >
                      节点 {index + 1}: {node.nodeName}
                    </Typography>
                    <IconButton
                      size='small'
                      onClick={() => removeNode(index)}
                    >
                      <Delete size={16} />
                    </IconButton>
                  </Stack>
                  <Stack
                    direction='row'
                    spacing={3}
                  >
                    <TextField
                      label='节点名称'
                      value={node.nodeName}
                      onChange={(e) => updateNode(index, 'nodeName', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>审批人类型</InputLabel>
                      <Select
                        value={node.approverType}
                        label='审批人类型'
                        onChange={(e) => updateNode(index, 'approverType', e.target.value)}
                      >
                        {approverTypeOptions.map((opt) => (
                          <MenuItem
                            key={opt.value}
                            value={opt.value}
                          >
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  {node.approverType === 'role' ? (
                    <TextField
                      label='审批角色'
                      value={node.approverRole || ''}
                      onChange={(e) => updateNode(index, 'approverRole', e.target.value)}
                      sx={{ mt: 2 }}
                    />
                  ) : (
                    <TextField
                      label='审批用户（逗号分隔）'
                      value={(node.approverUsers || []).join(',')}
                      onChange={(e) =>
                        updateNode(
                          index,
                          'approverUsers',
                          e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      sx={{ mt: 2 }}
                    />
                  )}
                  <Stack
                    direction='row'
                    spacing={3}
                    sx={{ mt: 2 }}
                  >
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>审批方式</InputLabel>
                      <Select
                        value={node.approvalType}
                        label='审批方式'
                        onChange={(e) => updateNode(index, 'approvalType', e.target.value)}
                      >
                        {approvalTypeOptions.map((opt) => (
                          <MenuItem
                            key={opt.value}
                            value={opt.value}
                          >
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label='超时时间（小时）'
                      type='number'
                      value={node.timeoutHours || 48}
                      onChange={(e) => updateNode(index, 'timeoutHours', Number(e.target.value))}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Card>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSave}
          >
            {editingConfig ? '保存修改' : '创建配置'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>审批配置详情</DialogTitle>
        <DialogContent dividers>
          {selectedConfig && (
            <Stack
              spacing={3}
              sx={{ mt: 2 }}
            >
              <Stack
                direction='row'
                spacing={3}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    配置名称
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>{selectedConfig.name}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Typography
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      bgcolor: selectedConfig.isActive ? '#e8f5e9' : '#ffebee',
                      color: selectedConfig.isActive ? '#2e7d32' : '#c62828',
                      width: 'fit-content',
                    }}
                  >
                    {selectedConfig.isActive ? '启用' : '禁用'}
                  </Typography>
                </Box>
              </Stack>
              {selectedConfig.description && (
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    描述
                  </Typography>
                  <Typography>{selectedConfig.description}</Typography>
                </Box>
              )}
              <Stack
                direction='row'
                spacing={3}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    金额阈值
                  </Typography>
                  <Typography>¥{selectedConfig.amountThreshold.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    金额上限
                  </Typography>
                  <Typography>
                    {selectedConfig.maxAmount
                      ? `¥${selectedConfig.maxAmount.toLocaleString()}`
                      : '无限制'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    审批层级
                  </Typography>
                  <Typography>{selectedConfig.approvalLevels} 级</Typography>
                </Box>
              </Stack>
              <Stack
                direction='row'
                spacing={3}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    优先级
                  </Typography>
                  <Typography>
                    {priorityOptions.find((p) => p.value === selectedConfig.priority)?.label ||
                      selectedConfig.priority}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    工作流 ID
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace' }}>
                    {selectedConfig.workflowId || '-'}
                  </Typography>
                </Box>
              </Stack>

              {selectedConfig.nodes && selectedConfig.nodes.length > 0 && (
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    审批节点
                  </Typography>
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell>层级</TableCell>
                          <TableCell>节点名称</TableCell>
                          <TableCell>审批人类型</TableCell>
                          <TableCell>审批方式</TableCell>
                          <TableCell>超时时间</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedConfig.nodes.map((node, index) => (
                          <TableRow key={index}>
                            <TableCell>{node.nodeLevel}</TableCell>
                            <TableCell>{node.nodeName}</TableCell>
                            <TableCell>
                              {node.approverType === 'role'
                                ? `角色: ${node.approverRole}`
                                : `用户: ${(node.approverUsers || []).join(', ')}`}
                            </TableCell>
                            <TableCell>
                              {approvalTypeOptions.find((a) => a.value === node.approvalType)
                                ?.label || node.approvalType}
                            </TableCell>
                            <TableCell>{node.timeoutHours} 小时</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                <Stack
                  direction='row'
                  spacing={6}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      创建时间
                    </Typography>
                    <Typography>
                      {selectedConfig.createdAt
                        ? new Date(selectedConfig.createdAt).toLocaleString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      更新时间
                    </Typography>
                    <Typography>
                      {selectedConfig.updatedAt
                        ? new Date(selectedConfig.updatedAt).toLocaleString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
          {selectedConfig && (
            <Button
              variant='contained'
              onClick={() => {
                setShowDetailDialog(false);
                handleEdit(selectedConfig);
              }}
            >
              编辑
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除该审批配置吗？此操作不可恢复。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>取消</Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDeleteAction}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceApprovalConfigPage;
