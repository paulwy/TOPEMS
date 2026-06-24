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
  Grid,
  Card,
  CardContent,
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
  Build as BuildIcon,
} from '@mui/icons-material';
import { useMesStore } from '../store/mesStore';
import type { CreateEquipmentRequest } from '../api';

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'in_use':
      return 'success';
    case 'idle':
      return 'info';
    case 'maintenance':
      return 'warning';
    case 'scrapped':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    in_use: '使用中',
    idle: '空闲',
    maintenance: '维护中',
    scrapped: '已报废',
  };
  return map[status] || status;
};

export const EquipmentManagementPage: React.FC = () => {
  const {
    equipment,
    equipmentTotal,
    equipmentPage,
    equipmentPageSize,
    equipmentStatistics,
    loading,
    error,
    loadEquipment,
    loadEquipmentStatistics,
    addEquipment,
    removeEquipment,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState<CreateEquipmentRequest>({
    code: '',
    name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEquipment({ page: 1, pageSize: 10 });
    loadEquipmentStatistics();
  }, [loadEquipment, loadEquipmentStatistics]);

  const handleSearch = () => {
    loadEquipment({
      page: 1,
      pageSize: equipmentPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadEquipment({
      page,
      pageSize: equipmentPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateEquipment = async () => {
    if (!newEquipment.code || !newEquipment.name) return;
    setSubmitting(true);
    try {
      await addEquipment(newEquipment);
      setCreateDialogOpen(false);
      setNewEquipment({ code: '', name: '' });
      loadEquipmentStatistics();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('确定要删除该设备吗？')) return;
    await removeEquipment(id);
    loadEquipmentStatistics();
  };

  const totalPages = Math.ceil(equipmentTotal / equipmentPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>设备管理</Typography>
          <Typography variant="body2" color="text.secondary">管理生产设备和资产信息</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadEquipment({ page: equipmentPage, pageSize: equipmentPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新增设备
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">设备总数</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>{equipmentStatistics?.total ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">使用中</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>{equipmentStatistics?.in_use ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">维护中</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>{equipmentStatistics?.maintenance ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">已报废</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>{equipmentStatistics?.scrapped ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索设备编码、名称..."
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
              <MenuItem value="in_use">使用中</MenuItem>
              <MenuItem value="idle">空闲</MenuItem>
              <MenuItem value="maintenance">维护中</MenuItem>
              <MenuItem value="scrapped">已报废</MenuItem>
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
                <TableCell>设备编码</TableCell>
                <TableCell>设备名称</TableCell>
                <TableCell>型号</TableCell>
                <TableCell>厂家</TableCell>
                <TableCell>位置</TableCell>
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
              ) : equipment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无设备数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                equipment.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BuildIcon fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.code}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.model || '-'}</TableCell>
                    <TableCell>{item.manufacturer || '-'}</TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
                    <TableCell>{item.responsible_person || '-'}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(item.status)} size="small" color={getStatusColor(item.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteEquipment(item.id)} title="删除">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {equipmentTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={equipmentPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增设备</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="设备编码" required value={newEquipment.code} onChange={(e) => setNewEquipment({ ...newEquipment, code: e.target.value })} fullWidth />
            <TextField label="设备名称" required value={newEquipment.name} onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })} fullWidth />
            <TextField label="型号" value={newEquipment.model || ''} onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })} fullWidth />
            <TextField label="厂家" value={newEquipment.manufacturer || ''} onChange={(e) => setNewEquipment({ ...newEquipment, manufacturer: e.target.value })} fullWidth />
            <TextField label="分类" value={newEquipment.category || ''} onChange={(e) => setNewEquipment({ ...newEquipment, category: e.target.value })} fullWidth />
            <TextField label="位置" value={newEquipment.location || ''} onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })} fullWidth />
            <TextField label="负责人" value={newEquipment.responsible_person || ''} onChange={(e) => setNewEquipment({ ...newEquipment, responsible_person: e.target.value })} fullWidth />
            <TextField label="采购日期" type="date" value={newEquipment.purchase_date || ''} onChange={(e) => setNewEquipment({ ...newEquipment, purchase_date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateEquipment} disabled={submitting || !newEquipment.code || !newEquipment.name}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EquipmentManagementPage;
