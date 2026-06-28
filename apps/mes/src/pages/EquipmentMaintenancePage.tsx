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
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

import { useMesStore } from '../store/mesStore';
import type { CreateMaintenanceRecord } from '../api';
import { Plus, RefreshCw, Wrench } from 'lucide-react';
const AddIcon = Plus;
const BuildIcon = Wrench;
const RefreshIcon = RefreshCw;

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

export const EquipmentMaintenancePage: React.FC = () => {
  const {
    maintenances,
    maintenancesTotal,
    maintenancesPage,
    maintenancesPageSize,
    loading,
    error,
    loadMaintenances,
    addMaintenance,
    updateMaintenanceStatus,
    equipmentStatistics,
    loadEquipmentStatistics,
  } = useMesStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<CreateMaintenanceRecord>({
    equipment_id: '',
    maintenance_type: 'preventive',
    description: '',
    maintainer: '',
    start_time: new Date().toISOString(),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMaintenances({ page: 1, pageSize: 10 });
    loadEquipmentStatistics();
  }, [loadMaintenances, loadEquipmentStatistics]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadMaintenances({ page, pageSize: maintenancesPageSize });
  };

  const handleCreateMaintenance = async () => {
    if (!newRecord.equipment_id || !newRecord.description || !newRecord.maintainer) return;
    setSubmitting(true);
    try {
      await addMaintenance(newRecord);
      setCreateDialogOpen(false);
      setNewRecord({
        equipment_id: '',
        maintenance_type: 'preventive',
        description: '',
        maintainer: '',
        start_time: new Date().toISOString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteMaintenance = async (id: string) => {
    await updateMaintenanceStatus(id, { status: 'completed', result: '完成' });
  };

  const totalPages = Math.ceil(maintenancesTotal / maintenancesPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>设备维护</Typography>
          <Typography variant="body2" color="text.secondary">管理设备维护和保养记录</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadMaintenances({ page: maintenancesPage, pageSize: maintenancesPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            新增维护
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">月度维护</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>{equipmentStatistics?.monthly_maintenances ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">月度点检</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>{equipmentStatistics?.monthly_inspections ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">维护中设备</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>{equipmentStatistics?.maintenance ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">待维修</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>{equipmentStatistics?.pending_repairs ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>设备</TableCell>
                <TableCell>维护类型</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>维护人</TableCell>
                <TableCell>开始时间</TableCell>
                <TableCell>费用</TableCell>
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
              ) : maintenances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无维护记录</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                maintenances.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BuildIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{record.equipment_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{record.equipment_code}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{record.maintenance_type}</TableCell>
                    <TableCell>{record.description}</TableCell>
                    <TableCell>{record.maintainer}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.start_time ? new Date(record.start_time).toLocaleString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{record.cost ?? '-'}</TableCell>
                    <TableCell>
                      <Chip label={record.status} size="small" color={getStatusColor(record.status)} />
                    </TableCell>
                    <TableCell align="right">
                      {record.status !== 'completed' && (
                        <Button size="small" variant="outlined" onClick={() => handleCompleteMaintenance(record.id)}>
                          完成
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {maintenancesTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={maintenancesPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增设备维护</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="设备ID" required value={newRecord.equipment_id} onChange={(e) => setNewRecord({ ...newRecord, equipment_id: e.target.value })} fullWidth />
            <FormControl fullWidth required>
              <InputLabel>维护类型</InputLabel>
              <Select value={newRecord.maintenance_type} label="维护类型" onChange={(e) => setNewRecord({ ...newRecord, maintenance_type: e.target.value })}>
                <MenuItem value="preventive">预防性维护</MenuItem>
                <MenuItem value="corrective">故障维修</MenuItem>
                <MenuItem value="predictive">预测性维护</MenuItem>
                <MenuItem value="inspection">点检</MenuItem>
              </Select>
            </FormControl>
            <TextField label="维护描述" required multiline rows={3} value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} fullWidth />
            <TextField label="维护人" required value={newRecord.maintainer} onChange={(e) => setNewRecord({ ...newRecord, maintainer: e.target.value })} fullWidth />
            <TextField label="费用" type="number" value={newRecord.cost || ''} onChange={(e) => setNewRecord({ ...newRecord, cost: Number(e.target.value) })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateMaintenance} disabled={submitting || !newRecord.equipment_id || !newRecord.description || !newRecord.maintainer}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EquipmentMaintenancePage;
