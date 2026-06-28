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

import { useMesStore } from '../store/mesStore';
import type { CreateProductionRecordRequest } from '../api';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;

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

export const ProductionRecordPage: React.FC = () => {
  const {
    productionRecords,
    productionRecordsTotal,
    productionRecordsPage,
    productionRecordsPageSize,
    loading,
    error,
    loadProductionRecords,
    addProductionRecord,
    removeProductionRecord,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<CreateProductionRecordRequest>({
    order_id: '',
    operator: '',
    quantity_completed: 1,
    start_time: new Date().toISOString(),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProductionRecords({ page: 1, pageSize: 10 });
  }, [loadProductionRecords]);

  const handleSearch = () => {
    loadProductionRecords({
      page: 1,
      pageSize: productionRecordsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadProductionRecords({
      page,
      pageSize: productionRecordsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateRecord = async () => {
    if (!newRecord.order_id || !newRecord.operator) return;
    setSubmitting(true);
    try {
      await addProductionRecord(newRecord);
      setCreateDialogOpen(false);
      setNewRecord({
        order_id: '',
        operator: '',
        quantity_completed: 1,
        start_time: new Date().toISOString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('确定要删除该生产记录吗？')) return;
    await removeProductionRecord(id);
  };

  const totalPages = Math.ceil(productionRecordsTotal / productionRecordsPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>生产记录</Typography>
          <Typography variant="body2" color="text.secondary">查看和管理生产过程记录</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadProductionRecords({ page: productionRecordsPage, pageSize: productionRecordsPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新增记录
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索操作员..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 4, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
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
                <TableCell>订单ID</TableCell>
                <TableCell>工序</TableCell>
                <TableCell>工作站</TableCell>
                <TableCell>操作员</TableCell>
                <TableCell>完成数</TableCell>
                <TableCell>不良数</TableCell>
                <TableCell>开始时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : productionRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无记录数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                productionRecords.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>{record.order_id}</TableCell>
                    <TableCell>{record.process_id || '-'}</TableCell>
                    <TableCell>{record.work_station_id || '-'}</TableCell>
                    <TableCell>{record.operator}</TableCell>
                    <TableCell>{record.quantity_completed}</TableCell>
                    <TableCell>{record.quantity_rejected || 0}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.start_time ? new Date(record.start_time).toLocaleString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={record.status} size="small" color={getStatusColor(record.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteRecord(record.id)} title="删除">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {productionRecordsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={productionRecordsPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增生产记录</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="订单ID" required value={newRecord.order_id} onChange={(e) => setNewRecord({ ...newRecord, order_id: e.target.value })} fullWidth />
            <TextField label="操作员" required value={newRecord.operator} onChange={(e) => setNewRecord({ ...newRecord, operator: e.target.value })} fullWidth />
            <TextField label="完成数" type="number" required value={newRecord.quantity_completed} onChange={(e) => setNewRecord({ ...newRecord, quantity_completed: Number(e.target.value) })} fullWidth />
            <TextField label="不良数" type="number" value={newRecord.quantity_rejected || 0} onChange={(e) => setNewRecord({ ...newRecord, quantity_rejected: Number(e.target.value) })} fullWidth />
            <TextField label="工序ID" value={newRecord.process_id || ''} onChange={(e) => setNewRecord({ ...newRecord, process_id: e.target.value })} fullWidth />
            <TextField label="工作站ID" value={newRecord.work_station_id || ''} onChange={(e) => setNewRecord({ ...newRecord, work_station_id: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateRecord} disabled={submitting || !newRecord.order_id || !newRecord.operator}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionRecordPage;
