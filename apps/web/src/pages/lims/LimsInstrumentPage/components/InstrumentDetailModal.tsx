import React from 'react';
import { Grid } from '@/components';
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
  Chip,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import { X } from 'lucide-react';
import type { Instrument, MaintenanceRecord } from '@/api/lims';

interface InstrumentDetailModalProps {
  open: boolean;
  onClose: () => void;
  instrument: Instrument | null;
  maintenanceRecords: MaintenanceRecord[];
  getStatusColor: (status: string) => { bgcolor: string; color: string };
  onEdit: (instrument: Instrument) => void;
  onAddMaintenance: (instrument: Instrument) => void;
  ct: {
    teal: {
      100: string;
      600: string;
      700: string;
    };
  };
}

const InstrumentDetailModal: React.FC<InstrumentDetailModalProps> = ({
  open,
  onClose,
  instrument,
  maintenanceRecords,
  getStatusColor,
  onEdit,
  onAddMaintenance,
  ct,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogContent sx={{ p: 3 }}>
        {instrument && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Typography
                variant='h5'
                sx={{ fontWeight: 'semibold' }}
              >
                仪器详情
              </Typography>
              <IconButton
                onClick={onClose}
                aria-label='关闭仪器详情对话框'
              >
                <X size={24} />
              </IconButton>
            </Box>

            <Stack spacing={3}>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'semibold' }}
                  >
                    {instrument.name}
                  </Typography>
                  <Chip
                    size='small'
                    label={instrument.status}
                    sx={{
                      bgcolor: getStatusColor(instrument.status).bgcolor,
                      color: getStatusColor(instrument.status).color,
                      fontWeight: 500,
                      px: 1.5,
                    }}
                  />
                </Box>
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ mb: 1.5 }}
                >
                  <Chip
                    size='small'
                    label={instrument.type}
                    sx={{ bgcolor: ct.teal[100], color: ct.teal[700] }}
                  />
                  <Chip
                    size='small'
                    label={instrument.code}
                    sx={{
                      bgcolor: 'grey.100',
                      color: 'text.secondary',
                      fontFamily: 'monospace',
                    }}
                  />
                </Stack>
                <Typography color='text.secondary'>
                  {instrument.description || '暂无备注'}
                </Typography>
              </Box>

              <Grid
                container
                spacing={2}
                sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}
              >
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    制造商
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {instrument.manufacturer || '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    型号
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {instrument.model || '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    序列号
                  </Typography>
                  <Typography
                    sx={{
                      ...{ fontFamily: 'monospace' },
                      fontWeight: 'medium',
                    }}
                  >
                    {instrument.serial_number || '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    存放位置
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {instrument.location || '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    负责人
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {instrument.responsible_person || '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    购买日期
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {instrument.purchase_date
                      ? new Date(instrument.purchase_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    上次校准
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {instrument.calibration_date
                      ? new Date(instrument.calibration_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    下次校准
                  </Typography>
                  <Typography
                    sx={{
                      ...{
                        color: instrument.next_calibration_date
                          ? 'warning.600'
                          : 'text.primary',
                      },
                      fontWeight: 'medium',
                    }}
                  >
                    {instrument.next_calibration_date
                      ? new Date(instrument.next_calibration_date).toLocaleDateString(
                          'zh-CN'
                        )
                      : '-'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    创建时间
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {new Date(instrument.created_at).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    更新时间
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {new Date(instrument.updated_at).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography sx={{ ...{ mb: 1.5 }, fontWeight: 'semibold' }}>维护记录</Typography>
                {maintenanceRecords.length === 0 ? (
                  <Typography
                    color='text.secondary'
                    sx={{ textAlign: 'center', py: 2 }}
                  >
                    暂无维护记录
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {maintenanceRecords.map((record) => (
                      <Paper
                        key={record.id}
                        variant='outlined'
                        sx={{ p: 2, borderRadius: 1.5 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              ...{ color: ct.teal[700] },
                              fontWeight: 'medium',
                            }}
                          >
                            {record.maintenance_type}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {new Date(record.performed_at).toLocaleDateString('zh-CN')}
                          </Typography>
                        </Box>
                        <Typography sx={{ mb: 1 }}>{record.description}</Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 14,
                          }}
                          color='text.secondary'
                        >
                          <span>执行人: {record.performed_by}</span>
                          {record.cost && <span>费用: ¥{record.cost}</span>}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button
                  onClick={() => {
                    onClose();
                    onAddMaintenance(instrument);
                  }}
                  variant='outlined'
                  sx={{ color: ct.teal[600], borderColor: ct.teal[600] }}
                >
                  添加维护记录
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    onEdit(instrument);
                  }}
                  variant='outlined'
                  color='primary'
                >
                  编辑
                </Button>
                <Button
                  onClick={onClose}
                  variant='contained'
                  color='inherit'
                  sx={{
                    bgcolor: 'grey.100',
                    '&:hover': { bgcolor: 'grey.200' },
                  }}
                >
                  关闭
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InstrumentDetailModal;
