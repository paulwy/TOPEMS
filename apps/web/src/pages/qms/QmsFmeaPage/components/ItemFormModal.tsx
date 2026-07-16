import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Button,
  Slider,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { getRpnRiskLevel, getSeverityLabel } from '../utils';

export interface ItemFormData {
  itemNo: string;
  functionDescription: string;
  failureMode: string;
  failureEffect: string;
  severity: number;
  failureCause: string;
  occurrence: number;
  currentControls: string;
  detection: number;
  recommendedActions: string;
  responsibility: string;
  targetDate: string;
}

interface ItemFormModalProps {
  open: boolean;
  isEditing: boolean;
  formData: ItemFormData;
  errors: Record<string, string>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: ItemFormData) => void;
  onFieldErrorClear: (field: string) => void;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
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
      <DialogTitle>{isEditing ? '编辑 FMEA 项目' : '添加 FMEA 项目'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              功能描述 *
            </Box>
            <TextField
              size='small'
              fullWidth
              value={formData.functionDescription}
              onChange={(e) => {
                onFormDataChange({ ...formData, functionDescription: e.target.value });
                if (errors.functionDescription)
                  onFieldErrorClear('functionDescription');
              }}
              placeholder='描述预期功能'
              error={!!errors.functionDescription}
              helperText={errors.functionDescription}
            />
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
                失效模式 *
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.failureMode}
                onChange={(e) => {
                  onFormDataChange({ ...formData, failureMode: e.target.value });
                  if (errors.failureMode)
                    onFieldErrorClear('failureMode');
                }}
                placeholder='失效模式'
                error={!!errors.failureMode}
                helperText={errors.failureMode}
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
                失效影响
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.failureEffect}
                onChange={(e) =>
                  onFormDataChange({ ...formData, failureEffect: e.target.value })
                }
                placeholder='失效影响'
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
              失效原因
            </Box>
            <TextField
              size='small'
              fullWidth
              value={formData.failureCause}
              onChange={(e) =>
                onFormDataChange({ ...formData, failureCause: e.target.value })
              }
              placeholder='导致失效的原因'
            />
          </Box>

          {/* S, O, D 评分 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
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
                严重度 (S) * 1-10
              </Box>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={formData.severity}
                  onChange={(_, v) =>
                    onFormDataChange({ ...formData, severity: v as number })
                  }
                  min={1}
                  max={10}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                  ]}
                  color={
                    formData.severity >= 8
                      ? 'error'
                      : formData.severity >= 5
                        ? 'warning'
                        : 'success'
                  }
                />
              </Box>
              <Typography
                align='center'
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {formData.severity} - {getSeverityLabel(formData.severity)}
              </Typography>
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
                发生度 (O) * 1-10
              </Box>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={formData.occurrence}
                  onChange={(_, v) =>
                    onFormDataChange({ ...formData, occurrence: v as number })
                  }
                  min={1}
                  max={10}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                  ]}
                  color={
                    formData.occurrence >= 8
                      ? 'error'
                      : formData.occurrence >= 5
                        ? 'warning'
                        : 'success'
                  }
                />
              </Box>
              <Typography
                align='center'
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {formData.occurrence}
              </Typography>
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
                探测度 (D) * 1-10
              </Box>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={formData.detection}
                  onChange={(_, v) =>
                    onFormDataChange({ ...formData, detection: v as number })
                  }
                  min={1}
                  max={10}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                  ]}
                  color={
                    formData.detection >= 8
                      ? 'error'
                      : formData.detection >= 5
                        ? 'warning'
                        : 'success'
                  }
                />
              </Box>
              <Typography
                align='center'
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {formData.detection}
              </Typography>
            </Box>
          </Box>

          {/* RPN 预览 */}
          <Alert severity='info'>
            RPN = S × O × D = {formData.severity} × {formData.occurrence} ×{' '}
            {formData.detection} ={' '}
            <strong>
              {formData.severity * formData.occurrence * formData.detection}
            </strong>
            {(() => {
              const rpn =
                formData.severity * formData.occurrence * formData.detection;
              const risk = getRpnRiskLevel(rpn);
              return (
                <Chip
                  label={`风险等级: ${risk.level}`}
                  size='small'
                  color={risk.color}
                  sx={{ ml: 1 }}
                />
              );
            })()}
          </Alert>

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
              当前控制措施
            </Box>
            <TextField
              size='small'
              fullWidth
              value={formData.currentControls}
              onChange={(e) =>
                onFormDataChange({ ...formData, currentControls: e.target.value })
              }
              placeholder='现有的控制措施'
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
              建议措施
            </Box>
            <TextField
              size='small'
              fullWidth
              multiline
              rows={2}
              value={formData.recommendedActions}
              onChange={(e) =>
                onFormDataChange({ ...formData, recommendedActions: e.target.value })
              }
              placeholder='降低风险的推荐措施'
            />
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
                责任人
              </Box>
              <TextField
                size='small'
                fullWidth
                value={formData.responsibility}
                onChange={(e) =>
                  onFormDataChange({ ...formData, responsibility: e.target.value })
                }
                placeholder='责任人'
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
                目标日期
              </Box>
              <TextField
                size='small'
                fullWidth
                type='date'
                value={formData.targetDate}
                onChange={(e) =>
                  onFormDataChange({ ...formData, targetDate: e.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
            </Box>
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
          {submitting ? '保存中...' : isEditing ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemFormModal;
