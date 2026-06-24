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
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useMesStore } from '../store/mesStore';
import type { CreateSampleRequest } from '../api';

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'completed':
    case 'qualified':
      return 'success';
    case 'testing':
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'unqualified':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待检',
    testing: '检验中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status;
};

export const LimsSamplePage: React.FC = () => {
  const {
    limsSamples,
    limsSamplesTotal,
    limsSamplesPage,
    limsSamplesPageSize,
    loading,
    error,
    loadLimsSamples,
    addLimsSample,
    removeLimsSample,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSample, setNewSample] = useState<CreateSampleRequest>({
    name: '',
    description: '',
    status: 'pending',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLimsSamples({ page: 1, pageSize: 10 });
  }, [loadLimsSamples]);

  const handleSearch = () => {
    loadLimsSamples({
      page: 1,
      pageSize: limsSamplesPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadLimsSamples({
      page,
      pageSize: limsSamplesPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateSample = async () => {
    if (!newSample.name) return;
    setSubmitting(true);
    try {
      await addLimsSample(newSample);
      setCreateDialogOpen(false);
      setNewSample({ name: '', description: '', status: 'pending' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSample = async (id: string) => {
    if (!window.confirm('确定要删除该样品吗？')) return;
    await removeLimsSample(id);
  };

  const totalPages = Math.ceil(limsSamplesTotal / limsSamplesPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>样品管理</Typography>
          <Typography variant="body2" color="text.secondary">管理实验室样品接收、流转和归档</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadLimsSamples({ page: limsSamplesPage, pageSize: limsSamplesPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新增样品
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索样品名称、编号..."
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
              <MenuItem value="pending">待检</MenuItem>
              <MenuItem value="testing">检验中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="cancelled">已取消</MenuItem>
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
                <TableCell>样品编号</TableCell>
                <TableCell>样品名称</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>接收日期</TableCell>
                <TableCell>项目</TableCell>
                <TableCell>负责人</TableCell>
                <TableCell>状态</TableCell>
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
              ) : limsSamples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无样品数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                limsSamples.map((sample) => (
                  <TableRow key={sample.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScienceIcon fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{sample.sample_no || sample.id.slice(0, 8)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{sample.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sample.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {sample.received_date ? new Date(sample.received_date).toLocaleDateString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{sample.project_id || '-'}</TableCell>
                    <TableCell>{sample.responsible_person || '-'}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(sample.status)} size="small" color={getStatusColor(sample.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteSample(sample.id)} title="删除">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {limsSamplesTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={limsSamplesPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增样品</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="样品名称" required value={newSample.name} onChange={(e) => setNewSample({ ...newSample, name: e.target.value })} fullWidth />
            <TextField label="描述" required multiline rows={3} value={newSample.description} onChange={(e) => setNewSample({ ...newSample, description: e.target.value })} fullWidth />
            <TextField label="项目ID" value={newSample.project_id || ''} onChange={(e) => setNewSample({ ...newSample, project_id: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select value={newSample.status} label="状态" onChange={(e) => setNewSample({ ...newSample, status: e.target.value })}>
                <MenuItem value="pending">待检</MenuItem>
                <MenuItem value="testing">检验中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateSample} disabled={submitting || !newSample.name || !newSample.description}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsSamplePage;
