import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usePmStore } from '../store/pmStore';
import type { CreateTaskRequest } from '../api/pm';

const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' | 'error' => {
  switch (status) {
    case 'active':
    case 'in_progress':
      return 'success';
    case 'completed':
    case 'done':
      return 'primary';
    case 'pending':
    case 'not_started':
      return 'warning';
    case 'blocked':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
    case 'in_progress':
      return '进行中';
    case 'completed':
    case 'done':
      return '已完成';
    case 'pending':
    case 'not_started':
      return '待开始';
    case 'blocked':
      return '阻塞';
    default:
      return status;
  }
};

export const ProjectTaskPage: React.FC = () => {
  const {
    tasks,
    tasksTotal,
    tasksPage,
    tasksPageSize,
    loading,
    error,
    loadTasks,
    addTask,
    removeTask,
  } = usePmStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    project_id: '',
    name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks({ page: 1, pageSize: 10 });
  }, [loadTasks]);

  const handleSearch = () => {
    loadTasks({
      page: 1,
      pageSize: tasksPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadTasks({
      page,
      pageSize: tasksPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newTask.name || !newTask.project_id) return;
    setSubmitting(true);
    try {
      await addTask(newTask);
      setCreateDialogOpen(false);
      setNewTask({ project_id: '', name: '' });
    } catch (err) {
      console.error('创建任务失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该任务吗？')) return;
    try {
      await removeTask(id);
    } catch (err) {
      console.error('删除任务失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(tasksTotal / tasksPageSize),
    [tasksTotal, tasksPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            任务管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理项目任务和阶段
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadTasks({
                page: tasksPage,
                pageSize: tasksPageSize,
                status: statusFilter !== 'all' ? statusFilter : undefined,
              })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建任务
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="not_started">待开始</MenuItem>
                <MenuItem value="in_progress">进行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="blocked">阻塞</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button variant="outlined" onClick={handleSearch} fullWidth>
              搜索
            </Button>
          </Grid>
        </Grid>
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
                <TableCell>任务名称</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>进度</TableCell>
                <TableCell>负责人</TableCell>
                <TableCell>开始日期</TableCell>
                <TableCell>结束日期</TableCell>
                <TableCell>优先级</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无任务数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {task.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(task.status)}
                        size="small"
                        color={getStatusColor(task.status)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={task.progress || 0}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Box sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                          {task.progress || 0}%
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{task.assignee || '-'}</TableCell>
                    <TableCell>
                      {task.start_date
                        ? new Date(task.start_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {task.end_date
                        ? new Date(task.end_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>{task.priority || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(task.id)}
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
        {tasksTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={tasksPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建任务</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="项目 ID"
              required
              value={newTask.project_id}
              onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="任务名称"
              required
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="描述"
              multiline
              rows={3}
              value={newTask.description || ''}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="开始日期"
                  type="date"
                  value={newTask.start_date || ''}
                  onChange={(e) =>
                    setNewTask({ ...newTask, start_date: e.target.value })
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="结束日期"
                  type="date"
                  value={newTask.end_date || ''}
                  onChange={(e) =>
                    setNewTask({ ...newTask, end_date: e.target.value })
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newTask.name || !newTask.project_id}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectTaskPage;
