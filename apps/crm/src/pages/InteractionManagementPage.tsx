import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

import { useCrmStore } from '../store/crmStore';
import type { Interaction, CreateInteractionRequest, UpdateInteractionRequest } from '../api/crm';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;

const TYPE_LABELS: Record<string, string> = {
  call: '电话',
  email: '邮件',
  meeting: '会议',
  visit: '拜访',
  demo: '演示',
  other: '其他',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'primary';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

export const InteractionManagementPage: React.FC = () => {
  const {
    interactions,
    interactionsTotal,
    interactionsPage,
    interactionsPageSize,
    loading,
    error,
    loadInteractions,
    addInteraction,
    updateInteraction,
    removeInteraction,
  } = useCrmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [newInteraction, setNewInteraction] = useState<CreateInteractionRequest>({
    type: 'call',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInteractions({ page: 1, pageSize: 10 });
  }, [loadInteractions]);

  const handleSearch = () => {
    loadInteractions({
      page: 1,
      pageSize: interactionsPageSize,
      search: searchKeyword || undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadInteractions({
      page,
      pageSize: interactionsPageSize,
      search: searchKeyword || undefined,
    });
  };

  const handleCreate = async () => {
    if (!newInteraction.type) return;
    setSubmitting(true);
    try {
      await addInteraction(newInteraction);
      setCreateDialogOpen(false);
      setNewInteraction({ type: 'call' });
    } catch (err) {
      console.error('创建互动记录失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedInteraction) return;
    setSubmitting(true);
    try {
      const updateData: UpdateInteractionRequest = {
        type: selectedInteraction.type,
        subject: selectedInteraction.subject,
        content: selectedInteraction.content,
        scheduled_at: selectedInteraction.scheduled_at,
        completed_at: selectedInteraction.completed_at,
        status: selectedInteraction.status,
      };
      await updateInteraction(selectedInteraction.id, updateData);
      setEditDialogOpen(false);
      setSelectedInteraction(null);
    } catch (err) {
      console.error('更新互动记录失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该互动记录吗？')) return;
    try {
      await removeInteraction(id);
    } catch (err) {
      console.error('删除互动记录失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(interactionsTotal / interactionsPageSize),
    [interactionsTotal, interactionsPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            互动记录
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理客户沟通、拜访、会议等互动记录
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadInteractions({ page: interactionsPage, pageSize: interactionsPageSize, search: searchKeyword || undefined })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建互动
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索主题、内容..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 4, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 300 }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>类型</TableCell>
                <TableCell>主题</TableCell>
                <TableCell>排期时间</TableCell>
                <TableCell>完成时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : interactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无互动记录</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                interactions.map((interaction) => (
                  <TableRow key={interaction.id} hover>
                    <TableCell>
                      <Chip
                        label={TYPE_LABELS[interaction.type] || interaction.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {interaction.subject || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {interaction.scheduled_at
                        ? new Date(interaction.scheduled_at).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {interaction.completed_at
                        ? new Date(interaction.completed_at).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[interaction.status] || interaction.status}
                        size="small"
                        color={getStatusColor(interaction.status)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(interaction.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedInteraction(interaction);
                          setEditDialogOpen(true);
                        }}
                        title="编辑"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(interaction.id)}
                        title="删除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {interactionsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={interactionsPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建互动记录</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>类型</InputLabel>
              <Select
                value={newInteraction.type}
                label="类型"
                onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
              >
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="主题"
              value={newInteraction.subject || ''}
              onChange={(e) => setNewInteraction({ ...newInteraction, subject: e.target.value })}
              fullWidth
            />
            <TextField
              label="排期时间"
              type="datetime-local"
              value={newInteraction.scheduled_at || ''}
              onChange={(e) => setNewInteraction({ ...newInteraction, scheduled_at: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="内容"
              multiline
              rows={4}
              value={newInteraction.content || ''}
              onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑互动记录</DialogTitle>
        {selectedInteraction && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>类型</InputLabel>
                <Select
                  value={selectedInteraction.type}
                  label="类型"
                  onChange={(e) =>
                    setSelectedInteraction({ ...selectedInteraction, type: e.target.value })
                  }
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="主题"
                value={selectedInteraction.subject || ''}
                onChange={(e) =>
                  setSelectedInteraction({ ...selectedInteraction, subject: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={selectedInteraction.status}
                  label="状态"
                  onChange={(e) =>
                    setSelectedInteraction({ ...selectedInteraction, status: e.target.value })
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="排期时间"
                type="datetime-local"
                value={selectedInteraction.scheduled_at || ''}
                onChange={(e) =>
                  setSelectedInteraction({ ...selectedInteraction, scheduled_at: e.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="完成时间"
                type="datetime-local"
                value={selectedInteraction.completed_at || ''}
                onChange={(e) =>
                  setSelectedInteraction({ ...selectedInteraction, completed_at: e.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="内容"
                multiline
                rows={4}
                value={selectedInteraction.content || ''}
                onChange={(e) =>
                  setSelectedInteraction({ ...selectedInteraction, content: e.target.value })
                }
                fullWidth
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedInteraction(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InteractionManagementPage;
