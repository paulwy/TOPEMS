import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  FormControlLabel,
  Switch,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { Upload, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';
import type { LowCodeApp } from '../../api/lowcode/types';

interface AppPublishDialogProps {
  open: boolean;
  app: LowCodeApp | null;
  onClose: () => void;
  onPublish: (params: {
    version: string;
    description: string;
    isMajor?: boolean;
  }) => Promise<void> | void;
}

const steps = [
  { label: '版本信息', description: '设置新版本号和发布说明' },
  { label: '发布确认', description: '确认发布内容和影响范围' },
  { label: '发布中', description: '正在发布应用...' },
];

export const AppPublishDialog: React.FC<AppPublishDialogProps> = ({
  open,
  app,
  onClose,
  onPublish,
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [isMajor, setIsMajor] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<'success' | 'error' | null>(null);

  const currentVersion = app?.currentVersion || '0.1.0';

  const getNextMinorVersion = (v: string) => {
    const parts = v.split('.').map(Number);
    parts[1] += 1;
    parts[2] = 0;
    return parts.join('.');
  };

  const getNextMajorVersion = (v: string) => {
    const parts = v.split('.').map(Number);
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
    return parts.join('.');
  };

  const suggestedVersion = isMajor
    ? getNextMajorVersion(currentVersion)
    : getNextMinorVersion(currentVersion);

  React.useEffect(() => {
    if (open) {
      setActiveStep(0);
      setVersion(suggestedVersion);
      setDescription('');
      setIsMajor(false);
      setPublishResult(null);
      setPublishing(false);
    }
  }, [open, app?.currentVersion]);

  React.useEffect(() => {
    if (open) {
      setVersion(
        isMajor ? getNextMajorVersion(currentVersion) : getNextMinorVersion(currentVersion)
      );
    }
  }, [isMajor, open, currentVersion]);

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      handlePublish();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePublish = async () => {
    setPublishing(true);
    setActiveStep(2);
    try {
      await onPublish({ version, description, isMajor });
      setPublishResult('success');
    } catch (error) {
      setPublishResult('error');
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    if (!publishing) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Rocket style={{ width: 24, height: 24, color: theme.palette.primary.main }} />
        发布应用
      </DialogTitle>
      <DialogContent dividers>
        <Stepper
          activeStep={activeStep}
          orientation='vertical'
        >
          <Step>
            <StepLabel>版本信息</StepLabel>
            <StepContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    当前版本:
                  </Typography>
                  <Chip
                    label={`v${currentVersion}`}
                    size='small'
                    variant='outlined'
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isMajor}
                      onChange={(e) => setIsMajor(e.target.checked)}
                      size='small'
                    />
                  }
                  label='主版本更新'
                />
                <TextField
                  label='新版本号'
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  size='small'
                  helperText='例如: 1.0.0, 1.1.0, 2.0.0'
                  slotProps={{
                    input: {
                      startAdornment: (
                        <span style={{ color: theme.palette.text.secondary, marginRight: 4 }}>
                          v
                        </span>
                      ),
                    },
                  }}
                />
                <TextField
                  label='发布说明'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  size='small'
                  multiline
                  rows={3}
                  placeholder='描述本次发布的内容...'
                />
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>发布确认</StepLabel>
            <StepContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                <Alert
                  severity='warning'
                  icon={<AlertTriangle style={{ width: 20, height: 20 }} />}
                >
                  <Typography variant='body2'>
                    即将发布 <strong>v{version}</strong> 版本
                  </Typography>
                  <Typography variant='caption'>
                    发布后用户将看到新版本，请确保所有功能已测试通过
                  </Typography>
                </Alert>

                <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                  <Typography
                    variant='subtitle2'
                    gutterBottom
                  >
                    发布内容预览
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {app?.label || '应用名称'}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block' }}
                  >
                    数据模型: {app?.modelCount || 0} 个
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block' }}
                  >
                    页面数量: {app?.pageCount || 0} 个
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block' }}
                  >
                    工作流: {app?.workflowCount || 0} 个
                  </Typography>
                </Box>
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>发布中</StepLabel>
            <StepContent>
              <Box
                sx={{
                  py: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {publishResult === 'success' ? (
                  <>
                    <CheckCircle
                      style={{ width: 64, height: 64, color: theme.palette.success.main }}
                    />
                    <Typography
                      variant='h6'
                      color='success.main'
                    >
                      发布成功
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      v{version} 版本已成功发布
                    </Typography>
                  </>
                ) : publishResult === 'error' ? (
                  <>
                    <AlertTriangle
                      style={{ width: 64, height: 64, color: theme.palette.error.main }}
                    />
                    <Typography
                      variant='h6'
                      color='error.main'
                    >
                      发布失败
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      请稍后重试或联系技术支持
                    </Typography>
                  </>
                ) : (
                  <>
                    <Upload
                      style={{
                        width: 64,
                        height: 64,
                        color: theme.palette.primary.main,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Typography variant='h6'>正在发布...</Typography>
                    <Box sx={{ width: '100%', maxWidth: 200 }}>
                      <LinearProgress />
                    </Box>
                  </>
                )}
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
      <DialogActions>
        {activeStep < 2 && (
          <>
            <Button onClick={handleClose}>取消</Button>
            <Box sx={{ flex: 1 }} />
            {activeStep > 0 && <Button onClick={handleBack}>上一步</Button>}
            <Button
              variant='contained'
              onClick={handleNext}
            >
              {activeStep === 1 ? '确认发布' : '下一步'}
            </Button>
          </>
        )}
        {activeStep === 2 && publishResult !== null && (
          <Button
            variant='contained'
            onClick={handleClose}
          >
            完成
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AppPublishDialog;
