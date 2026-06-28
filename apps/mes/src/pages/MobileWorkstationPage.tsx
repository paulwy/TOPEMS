import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';

import { useMesStore } from '../store/mesStore';
import type { WorkStation, CreateProductionRecordRequest } from '../api';
import { CircleCheck, Play, QrCode, Smartphone } from 'lucide-react';
const CheckCircleIcon = CircleCheck;
const PlayArrowIcon = Play;
const QrCodeScannerIcon = QrCode;
const SmartphoneIcon = Smartphone;

export const MobileWorkstationPage: React.FC = () => {
  const { workStations, productionRecords, loadWorkStations, loadProductionRecords, addProductionRecord } = useMesStore();

  const [selectedStation, setSelectedStation] = useState<WorkStation | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRecord, setNewRecord] = useState<CreateProductionRecordRequest>({
    order_id: '',
    operator: '',
    quantity_completed: 1,
    start_time: new Date().toISOString(),
  });

  useEffect(() => {
    loadWorkStations({ page: 1, pageSize: 50 });
    loadProductionRecords({ page: 1, pageSize: 20 });
  }, [loadWorkStations, loadProductionRecords]);

  const handleStartWork = async () => {
    if (!selectedStation || !newRecord.order_id || !newRecord.operator) return;
    setSubmitting(true);
    try {
      await addProductionRecord({
        ...newRecord,
        work_station_id: selectedStation.id,
      });
      setScanDialogOpen(false);
      setNewRecord({
        order_id: '',
        operator: '',
        quantity_completed: 1,
        start_time: new Date().toISOString(),
      });
      setSelectedStation(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartphoneIcon color="primary" />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>移动工作站</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        现场操作员扫码开始生产并实时上报
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {workStations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Paper>
        ) : (
          workStations.map((station) => (
            <Card key={station.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{station.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      编码: {station.code} | 位置: {station.location || '-'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={station.status}
                        size="small"
                        color={station.status === 'running' ? 'success' : 'default'}
                      />
                      {station.supervisor && (
                        <Chip label={`负责人: ${station.supervisor}`} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => {
                      setSelectedStation(station);
                      setScanDialogOpen(true);
                    }}
                  >
                    开始生产
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>最近生产记录</Typography>
        {productionRecords.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无生产记录</Typography>
          </Paper>
        ) : (
          <Stack spacing={1}>
            {productionRecords.slice(0, 10).map((record) => (
              <Paper key={record.id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>操作员: {record.operator}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      订单: {record.order_id} | 完成: {record.quantity_completed}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {record.status === 'completed' ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <PlayArrowIcon color="info" fontSize="small" />
                    )}
                    <Chip label={record.status} size="small" />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>开始生产 - {selectedStation?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="订单号/扫码"
              required
              value={newRecord.order_id}
              onChange={(e) => setNewRecord({ ...newRecord, order_id: e.target.value })}
              fullWidth
              placeholder="请扫码或输入订单号"
            />
            <TextField
              label="操作员"
              required
              value={newRecord.operator}
              onChange={(e) => setNewRecord({ ...newRecord, operator: e.target.value })}
              fullWidth
            />
            <TextField
              label="完成数量"
              type="number"
              required
              value={newRecord.quantity_completed}
              onChange={(e) => setNewRecord({ ...newRecord, quantity_completed: Number(e.target.value) })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartWork}
            disabled={submitting || !newRecord.order_id || !newRecord.operator}
          >
            {submitting ? '提交中...' : '开始生产'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileWorkstationPage;
