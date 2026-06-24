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
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useMesStore } from '../store/mesStore';
import type { CreateQualityCheckRequest } from '../api';

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'completed':
    case 'qualified':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'unqualified':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    failed: '已驳回',
  };
  return map[status] || status;
};

export const QmsCheckPage: React.FC = () => {
  const {
    qualityChecks,
    qualityChecksTotal,
    qualityChecksPage,
    qualityChecksPageSize,
    loading,
    error,
    loadQualityChecks,
    addQualityCheck,
    removeQualityCheck,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCheck, setNewCheck] = useState<CreateQualityCheckRequest>({
    inspection_type: 'incoming',
    quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQualityChecks({ page: 1, pageSize: 10 });
  }, [loadQualityChecks]);

  const handleSearch = () => {
    loadQualityChecks({
      page: 1,
      pageSize: qualityChecksPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadQualityChecks({
      page,
      pageSize: qualityChecksPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateCheck = async () => {
    if (!newCheck.inspection_type || newCheck.quantity < 1) return;
    setSubmitting(true);
    try {
      await addQualityCheck(newCheck);
      setCreateDialogOpen(false);
      setNewCheck({ inspection_type: 'incoming', quantity: 1 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCheck = async (id: string) => {
    if (!window.confirm('确定要删除该质量检查吗？')) return;
    await removeQualityCheck(id);
  };

  const totalPages = Math.ceil(qualityChecksTotal / qualityChecksPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>质量检查</Typography>
          <Typography variant="body2" color="text.secondary">管理质量检查单和检验结果</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadQualityChecks({ page: qualityChecksPage, pageSize: qualityChecksPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新建检查
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索检查单..."
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
              <MenuItem value="pending">待处理</MenuItem>
              <MenuItem value="in_progress">进行中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="failed">已驳回</MenuItem>
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
                <TableCell>检查单号</TableCell>
                <TableCell>检查类型</TableCell>
                <TableCell>产品</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>合格</TableCell>
                <TableCell>不合格</TableCell>
                <TableCell>合格率</TableCell>
                <TableCell>检验员</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : qualityChecks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无检查数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                qualityChecks.map((check) => (
                  <TableRow key={check.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedIcon fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{check.inspection_no}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{check.inspection_type}</TableCell>
                    <TableCell>{check.product_name || '-'}</TableCell>
                    <TableCell>{check.quantity}</TableCell>
                    <TableCell>{check.qualified_quantity ?? '-'}</TableCell>
                    <TableCell>{check.unqualified_quantity ?? '-'}</TableCell>
                    <TableCell>{check.qualification_rate != null ? `${check.qualification_rate.toFixed(2)}%` : '-'}</TableCell>
                    <TableCell>{check.inspector || '-'}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(check.status)} size="small" color={getStatusColor(check.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleDeleteCheck(check.id)} title="删除">
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {qualityChecksTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={qualityChecksPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建质量检查</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>检查类型</InputLabel>
              <Select value={newCheck.inspection_type} label="检查类型" onChange={(e) => setNewCheck({ ...newCheck, inspection_type: e.target.value })}>
                <MenuItem value="incoming">来料检验</MenuItem>
                <MenuItem value="in_process">过程检验</MenuItem>
                <MenuItem value="final">成品检验</MenuItem>
                <MenuItem value="outgoing">出货检验</MenuItem>
              </Select>
            </FormControl>
            <TextField label="产品名称" value={newCheck.product_name || ''} onChange={(e) => setNewCheck({ ...newCheck, product_name: e.target.value })} fullWidth />
            <TextField label="数量" type="number" required value={newCheck.quantity} onChange={(e) => setNewCheck({ ...newCheck, quantity: Number(e.target.value) })} fullWidth />
            <TextField label="标准ID" value={newCheck.standard_id || ''} onChange={(e) => setNewCheck({ ...newCheck, standard_id: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateCheck} disabled={submitting}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QmsCheckPage;
