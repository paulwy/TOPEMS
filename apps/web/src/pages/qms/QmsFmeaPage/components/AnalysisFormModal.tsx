import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';

export interface AnalysisFormData {
  fmeaName: string;
  fmeaType: string;
  productName: string;
  processName: string;
  version: string;
  scope: string;
  teamLeader: string;
  teamMembers: string;
  description: string;
}

interface AnalysisFormModalProps {
  open: boolean;
  isEditing: boolean;
  formData: AnalysisFormData;
  errors: Record<string, string>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: AnalysisFormData) => void;
  onFieldErrorClear: (field: string) => void;
}

const AnalysisFormModal: React.FC<AnalysisFormModalProps> = ({
  open,
  isEditing,
  formData,
  errors,
  submitting,
  onClose,
  onSubmit,
  onFormDataChange,
  onFieldErrorClear,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>{isEditing ? '编辑 FMEA' : '新建 FMEA'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                FMEA 名称 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.fmeaName}
                onChange={(e) => {
                  onFormDataChange({ ...formData, fmeaName: e.target.value });
                  if (errors.fmeaName) onFieldErrorClear('fmeaName');
                }}
                placeholder='请输入 FMEA 名称'
                error={!!errors.fmeaName}
                helperText={errors.fmeaName}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                类型 *
              </Box>
              <FormControl
                fullWidth
                size='small'
              >
                <Select
                  value={formData.fmeaType}
                  onChange={(e) => onFormDataChange({ ...formData, fmeaType: e.target.value })}
                >
                  <MenuItem value='design'>设计 FMEA</MenuItem>
                  <MenuItem value='process'>过程 FMEA</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                产品名称
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.productName}
                onChange={(e) =>
                  onFormDataChange({ ...formData, productName: e.target.value })
                }
                placeholder='产品名称'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                工序名称
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.processName}
                onChange={(e) =>
                  onFormDataChange({ ...formData, processName: e.target.value })
                }
                placeholder='工序名称'
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                版本
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.version}
                onChange={(e) => onFormDataChange({ ...formData, version: e.target.value })}
                placeholder='1.0'
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                component='label'
                sx={{
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                团队负责人
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.teamLeader}
                onChange={(e) => onFormDataChange({ ...formData, teamLeader: e.target.value })}
                placeholder='负责人'
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              component='label'
              sx={{
                display: 'block',
                mb: 0.5,
                fontSize: '0.875rem',
                color: 'text.secondary',
              }}
            >
              团队成员 (逗号分隔)
            </Box>
            <TextField
              size='small'
              fullWidth
              value={formData.teamMembers}
              onChange={(e) => onFormDataChange({ ...formData, teamMembers: e.target.value })}
              placeholder='成员1, 成员2, ...'
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              component='label'
              sx={{
                display: 'block',
                mb: 0.5,
                fontSize: '0.875rem',
                color: 'text.secondary',
              }}
            >
              范围描述
            </Box>
            <TextField
              size='small'
              fullWidth
              multiline
              rows={2}
              value={formData.scope}
              onChange={(e) => onFormDataChange({ ...formData, scope: e.target.value })}
              placeholder='FMEA 分析的范围'
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              component='label'
              sx={{
                display: 'block',
                mb: 0.5,
                fontSize: '0.875rem',
                color: 'text.secondary',
              }}
            >
              描述
            </Box>
            <TextField
              size='small'
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              placeholder='FMEA 描述...'
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
          disabled={submitting}
        >
          取消
        </Button>
        <Button
          variant='contained'
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? '保存中...' : isEditing ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnalysisFormModal;
