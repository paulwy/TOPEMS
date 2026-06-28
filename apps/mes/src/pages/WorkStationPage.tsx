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
import type { CreateWorkStationRequest } from '../api';
import { MapPin, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const LocationIcon = MapPin;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'running':
      return 'success';
    case 'idle':
      return 'info';
    case 'maintenance':
      return 'warning';
    case 'offline':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    running: '运行中',
    idle: '空闲',
    maintenance: '维护中',
    offline: '离线',
  };
  return map[status] || status;
};

export const WorkStationPage: React.FC = () => {
  const {
    workStations,
    workStationsTotal,
    workStationsPage,
    workStationsPageSize,
    loading,
    error,
    loadWorkStations,
    addWorkStation,
    removeWorkStation,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newStation, setNewStation] = useState<CreateWorkStationRequest>({
    name: '',
    code: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWorkStations({ page: 1, pageSize: 10 });
  }, [loadWorkStations]);

  const handleSearch = () => {
    loadWorkStations({
      page: 1,
      pageSize: workStationsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadWorkStations({
      page,
      pageSize: workStationsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateStation = async () => {
    if (!newStation.name || !newStation.code) return;
    setSubmitting(true);
    try {
      await addWorkStation(newStation);
      setCreateDialogOpen(false);
      setNewStation({ name: '', code: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!window.confirm('确定要删除该工作站吗？')) return;
    await removeWorkStation(id);
  };

  const totalPages = Math.ceil(workStationsTotal / workStationsPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>工作站管理</Typography>
          <Typography variant="body2" color="text.secondary">管理工作站基础信息和运行状态</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadWorkStations({ page: workStationsPage, pageSize: workStationsPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新建工作站
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索工作站名称、编码..."
            
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
              <MenuItem value="running">运行中</MenuItem>
              <MenuItem value="idle">空闲</MenuItem>
              <MenuItem value="maintenance">维护中</MenuItem>
              <MenuItem value="offline">离线</MenuItem>
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
                <TableCell>工作站名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>位置</TableCell>
                <TableCell>产能</TableCell>
                <TableCell>负责人</TableCell>
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
              ) : workStations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无工作站数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                workStations.map((station) => (
                  <TableRow key={station.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{station.name}</Typography></TableCell>
                    <TableCell>{station.code || '-'}</TableCell>
                    <TableCell>
                      {station.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2">{station.location}</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{station.capacity || '-'}</TableCell>
                    <TableCell>{station.supervisor || '-'}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(station.status)} size="small" color={getStatusColor(station.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteStation(station.id)} title="删除">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {workStationsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={workStationsPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建工作站</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="工作站名称" required value={newStation.name} onChange={(e) => setNewStation({ ...newStation, name: e.target.value })} fullWidth />
            <TextField label="工作站编码" required value={newStation.code} onChange={(e) => setNewStation({ ...newStation, code: e.target.value })} fullWidth />
            <TextField label="位置" value={newStation.location || ''} onChange={(e) => setNewStation({ ...newStation, location: e.target.value })} fullWidth />
            <TextField label="产能" type="number" value={newStation.capacity || ''} onChange={(e) => setNewStation({ ...newStation, capacity: Number(e.target.value) })} fullWidth />
            <TextField label="负责人" value={newStation.supervisor || ''} onChange={(e) => setNewStation({ ...newStation, supervisor: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateStation} disabled={submitting || !newStation.name || !newStation.code}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkStationPage;
