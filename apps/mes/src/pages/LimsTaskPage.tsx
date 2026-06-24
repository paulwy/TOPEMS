import React, { useEffect, useState } from 'react';
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
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useMesStore } from '../store/mesStore';
import type { CreateInspectionTaskRequest } from '../api';

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

export const LimsTaskPage: React.FC = () => {
  const {
    limsTasks,
    limsTasksTotal,
    limsTasksPage,
    limsTasksPageSize,
    loading,
    error,
    loadLimsTasks,
    addLimsTask,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<CreateInspectionTaskRequest>({
    sample_id: '',
    process_id: '',
    inspector: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLimsTasks({ page: 1, pageSize: 10 });
  }, [loadLimsTasks]);

  const handleSearch = () => {
    loadLimsTasks({
      page: 1,
      pageSize: limsTasksPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadLimsTasks({
      page,
      pageSize: limsTasksPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateTask = async () => {
    if (!newTask.sample_id || !newTask.process_id || !newTask.inspector) return;
    setSubmitting(true);
    try {
      await addLimsTask(newTask);
      setCreateDialogOpen(false);
      setNewTask({ sample_id: '', process_id: '', inspector: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(limsTasksTotal / limsTasksPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>检验任务</Typography>
          <Typography variant="body2" color="text.secondary">分配和管理检验任务</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadLimsTasks({ page: limsTasksPage, pageSize: limsTasksPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新建任务
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索任务..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="pending">待开始</MenuItem>
              <MenuItem value="in_progress">进行中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>搜索</Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>任务编号</TableCell>
                <TableCell>样品</TableCell>
                <TableCell>检验流程</TableCell>
                <TableCell>当前步骤</TableCell>
                <TableCell>检验员</TableCell>
                <TableCell>开始时间</TableCell>
                <TableCell>完成时间</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : limsTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无任务数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                limsTasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentIcon fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.task_no || task.id.slice(0, 8)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{task.sample_name || task.sample_id}</TableCell>
                    <TableCell>{task.process_id}</TableCell>
                    <TableCell>{task.current_step}</TableCell>
                    <TableCell>{task.inspector}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {task.started_at ? new Date(task.started_at).toLocaleString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {task.completed_at ? new Date(task.completed_at).toLocaleString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={task.status} size="small" color={getStatusColor(task.status)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {limsTasksTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={limsTasksPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建检验任务</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="样品ID" required value={newTask.sample_id} onChange={(e) => setNewTask({ ...newTask, sample_id: e.target.value })} fullWidth />
            <TextField label="检验流程ID" required value={newTask.process_id} onChange={(e) => setNewTask({ ...newTask, process_id: e.target.value })} fullWidth />
            <TextField label="检验员" required value={newTask.inspector} onChange={(e) => setNewTask({ ...newTask, inspector: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateTask} disabled={submitting || !newTask.sample_id || !newTask.process_id || !newTask.inspector}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsTaskPage;
