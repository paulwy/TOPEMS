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
} from '@mui/material';

import { useMesStore } from '../store/mesStore';
import type { CreateProductionProcessRequest } from '../api';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;

export const ProductionProcessPage: React.FC = () => {
  const {
    productionProcesses,
    productionProcessesTotal,
    productionProcessesPage,
    productionProcessesPageSize,
    loading,
    error,
    loadProductionProcesses,
    addProductionProcess,
    removeProductionProcess,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProcess, setNewProcess] = useState<CreateProductionProcessRequest>({
    name: '',
    sequence: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProductionProcesses({ page: 1, pageSize: 10 });
  }, [loadProductionProcesses]);

  const handleSearch = () => {
    loadProductionProcesses({ page: 1, pageSize: productionProcessesPageSize, search: searchKeyword || undefined });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadProductionProcesses({ page, pageSize: productionProcessesPageSize, search: searchKeyword || undefined });
  };

  const handleCreateProcess = async () => {
    if (!newProcess.name) return;
    setSubmitting(true);
    try {
      await addProductionProcess(newProcess);
      setCreateDialogOpen(false);
      setNewProcess({ name: '', sequence: 1 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (!window.confirm('确定要删除该工序吗？')) return;
    await removeProductionProcess(id);
  };

  const totalPages = Math.ceil(productionProcessesTotal / productionProcessesPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>生产工序管理</Typography>
          <Typography variant="body2" color="text.secondary">管理生产工序和工艺路线</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadProductionProcesses({ page: productionProcessesPage, pageSize: productionProcessesPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            创建工序
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索工序名称..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 4, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 300 }}
          />
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
                <TableCell>工序名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>工序序号</TableCell>
                <TableCell>标准工时(分)</TableCell>
                <TableCell>工作站</TableCell>
                <TableCell>状态</TableCell>
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
              ) : productionProcesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无工序数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                productionProcesses.map((process) => (
                  <TableRow key={process.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{process.name}</Typography></TableCell>
                    <TableCell>{process.code || '-'}</TableCell>
                    <TableCell>{process.sequence}</TableCell>
                    <TableCell>{process.standard_time || '-'}</TableCell>
                    <TableCell>{process.work_station_id || '-'}</TableCell>
                    <TableCell>
                      <Chip label={process.status} size="small" color={process.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteProcess(process.id)} title="删除">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {productionProcessesTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={productionProcessesPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建生产工序</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="工序名称" required value={newProcess.name} onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })} fullWidth />
            <TextField label="工序编码" value={newProcess.code || ''} onChange={(e) => setNewProcess({ ...newProcess, code: e.target.value })} fullWidth />
            <TextField label="工序序号" type="number" required value={newProcess.sequence} onChange={(e) => setNewProcess({ ...newProcess, sequence: Number(e.target.value) })} fullWidth />
            <TextField label="标准工时(分)" type="number" value={newProcess.standard_time || ''} onChange={(e) => setNewProcess({ ...newProcess, standard_time: Number(e.target.value) })} fullWidth />
            <TextField label="工作站ID" value={newProcess.work_station_id || ''} onChange={(e) => setNewProcess({ ...newProcess, work_station_id: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateProcess} disabled={submitting || !newProcess.name}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionProcessPage;
