import React from 'react';
import { Grid } from '@/components';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Stack,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import { X } from 'lucide-react';
import type { Instrument, CreateMaintenanceRecordRequest } from '@/api/lims';

interface MaintenanceFormModalProps {
  open: boolean;
  onClose: () => void;
  instrument: Instrument | null;
  formData: CreateMaintenanceRecordRequest;
  setFormData: React.Dispatch<React.SetStateAction<CreateMaintenanceRecordRequest>>;
  onSubmit: () => void;
  creating: boolean;
  ct: {
    teal: {
      600: string;
      700: string;
    };
  };
}

const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  open,
  onClose,
  instrument,
  formData,
  setFormData,
  onSubmit,
  creating,
  ct,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 'semibold' }}
        >
          添加维护记录
        </Typography>
        <IconButton
          size='small'
          onClick={onClose}
          aria-label='关闭添加维护记录对话框'
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {instrument && (
          <Stack spacing={3}>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                仪器名称
              </Typography>
              <Typography sx={{ ...{ color: ct.teal[700] }, fontWeight: 'medium' }}>
                {instrument.name}
              </Typography>
            </Box>
            <FormControl
              fullWidth
              required
            >
              <InputLabel>维护类型</InputLabel>
              <Select
                value={formData.maintenance_type}
                label='维护类型'
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maintenance_type: e.target.value,
                  })
                }
              >
                <MenuItem value=''>请选择维护类型</MenuItem>
                <MenuItem value='日常维护'>日常维护</MenuItem>
                <MenuItem value='定期校准'>定期校准</MenuItem>
                <MenuItem value='故障维修'>故障维修</MenuItem>
                <MenuItem value='部件更换'>部件更换</MenuItem>
                <MenuItem value='性能验证'>性能验证</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='维护描述'
              required
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder='请输入维护描述'
            />
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='执行人'
                  required
                  fullWidth
                  value={formData.performed_by}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      performed_by: e.target.value,
                    })
                  }
                  placeholder='请输入执行人'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='执行日期'
                  type='date'
                  required
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } } as const}
                  value={formData.performed_at}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      performed_at: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='下次维护日期'
                  type='date'
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } } as const}
                  value={formData.next_maintenance_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      next_maintenance_date: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='费用（元）'
                  type='number'
                  fullWidth
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost: Number(e.target.value),
                    })
                  }
                  placeholder='0'
                />
              </Grid>
            </Grid>
            <TextField
              label='备注'
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              placeholder='请输入备注'
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant='outlined'
          color='inherit'
        >
          取消
        </Button>
        <Button
          onClick={onSubmit}
          disabled={creating}
          variant='contained'
          sx={{
            backgroundColor: ct.teal[600],
            '&:hover': { backgroundColor: ct.teal[700] },
          }}
        >
          {creating ? '创建中...' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaintenanceFormModal;
