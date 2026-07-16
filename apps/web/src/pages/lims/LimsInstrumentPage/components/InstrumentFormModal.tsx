import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Grid } from '@/components';
import { X } from 'lucide-react';
import type { CreateInstrumentRequest } from '@/api/lims';

interface InstrumentFormModalProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: CreateInstrumentRequest;
  setFormData: React.Dispatch<React.SetStateAction<CreateInstrumentRequest>>;
  onSubmit: () => void;
  creating: boolean;
  ct: {
    teal: {
      600: string;
      700: string;
    };
  };
}

const InstrumentFormModal: React.FC<InstrumentFormModalProps> = ({
  open,
  onClose,
  isEditing,
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
      maxWidth='md'
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
          {isEditing ? '编辑仪器' : '添加仪器'}
        </Typography>
        <IconButton
          size='small'
          onClick={onClose}
          aria-label='关闭添加仪器对话框'
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ maxHeight: '70vh' }}
      >
        <Stack spacing={3}>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='仪器名称'
                required
                fullWidth
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder='请输入仪器名称'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='仪器编号'
                required
                fullWidth
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value,
                  })
                }
                placeholder='请输入仪器编号'
              />
            </Grid>
          </Grid>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl
                fullWidth
                required
              >
                <InputLabel>仪器类型</InputLabel>
                <Select
                  value={formData.type}
                  label='仪器类型'
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                    })
                  }
                >
                  <MenuItem value=''>请选择类型</MenuItem>
                  <MenuItem value='分析仪器'>分析仪器</MenuItem>
                  <MenuItem value='测量仪器'>测量仪器</MenuItem>
                  <MenuItem value='实验设备'>实验设备</MenuItem>
                  <MenuItem value='其他'>其他</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>仪器状态</InputLabel>
                <Select
                  value={formData.status}
                  label='仪器状态'
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                >
                  <MenuItem value='正常'>正常</MenuItem>
                  <MenuItem value='维修中'>维修中</MenuItem>
                  <MenuItem value='校准中'>校准中</MenuItem>
                  <MenuItem value='报废'>报废</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='制造商'
                fullWidth
                value={formData.manufacturer}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    manufacturer: e.target.value,
                  })
                }
                placeholder='请输入制造商'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='型号'
                fullWidth
                value={formData.model}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    model: e.target.value,
                  })
                }
                placeholder='请输入型号'
              />
            </Grid>
          </Grid>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='序列号'
                fullWidth
                value={formData.serial_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    serial_number: e.target.value,
                  })
                }
                placeholder='请输入序列号'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='存放位置'
                fullWidth
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                placeholder='请输入存放位置'
              />
            </Grid>
          </Grid>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='购买日期'
                type='date'
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
                value={formData.purchase_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchase_date: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='上次校准日期'
                type='date'
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
                value={formData.calibration_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    calibration_date: e.target.value,
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
                label='下次校准日期'
                type='date'
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
                value={formData.next_calibration_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    next_calibration_date: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label='负责人'
                fullWidth
                value={formData.responsible_person}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responsible_person: e.target.value,
                  })
                }
                placeholder='请输入负责人'
              />
            </Grid>
          </Grid>
          <TextField
            label='备注说明'
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
            placeholder='请输入备注说明'
          />
        </Stack>
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
          {creating
            ? isEditing
              ? '更新中...'
              : '创建中...'
            : isEditing
              ? '更新'
              : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstrumentFormModal;
