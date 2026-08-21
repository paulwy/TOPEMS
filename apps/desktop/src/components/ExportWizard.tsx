import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Download, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  auditApi,
  EXPORT_FORMATS,
  RESOURCE_TYPES,
  type ExportResult,
} from '../api/audit';

interface ExportWizardProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ['选择资源', '选择格式', '配置筛选'];

const FORMAT_ICONS: Record<string, string> = {
  csv: 'CSV',
  json: 'JSON',
  excel: 'XLSX',
};

const ExportWizard = ({ open, onClose }: ExportWizardProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [resourceType, setResourceType] = useState('audit_logs');
  const [format, setFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [filtersText, setFiltersText] = useState('');
  const [filtersError, setFiltersError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleReset = () => {
    setActiveStep(0);
    setResourceType('audit_logs');
    setFormat('csv');
    setFiltersText('');
    setFiltersError(null);
    setExporting(false);
    setExportResult(null);
    setExportError(null);
  };

  const handleClose = () => {
    if (exporting) return;
    handleReset();
    onClose();
  };

  const validateFilters = (): Record<string, unknown> | null => {
    const trimmed = filtersText.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setFiltersError('筛选条件必须是 JSON 对象');
        return null;
      }
      setFiltersError(null);
      return parsed as Record<string, unknown>;
    } catch {
      setFiltersError('JSON 格式错误，请检查输入');
      return null;
    }
  };

  const handleNext = () => {
    if (activeStep === 2) {
      validateFilters();
    }
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleExport = async () => {
    const filters = validateFilters();
    if (filtersText.trim() && filters === null) return;

    setExporting(true);
    setExportError(null);
    setExportResult(null);

    try {
      const result = await auditApi.exportData({
        resourceType,
        format,
        filters: filters ?? undefined,
      });
      setExportResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '数据导出失败';
      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  const isComplete = exportResult !== null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Download size={20} />
        数据导出向导
      </DialogTitle>
      <DialogContent>
        {isComplete ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle size={56} color="#22c55e" />
            <Typography variant="h6" sx={{ mt: 2 }}>
              导出成功
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              资源类型: {RESOURCE_TYPES.find((r) => r.value === resourceType)?.label}
              {'  |  '}
              格式: {FORMAT_ICONS[format] ?? format}
            </Typography>
            {exportResult && (
              <Paper variant="outlined" sx={{ p: 2, mt: 2, textAlign: 'left' }}>
                <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(exportResult, null, 2)}
                </pre>
              </Paper>
            )}
          </Box>
        ) : (
          <>
            <Stepper activeStep={activeStep} sx={{ mt: 1, mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeStep === 0 && (
              <Box sx={{ minHeight: '200px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  选择要导出的资源类型
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>资源类型</InputLabel>
                  <Select
                    value={resourceType}
                    label="资源类型"
                    onChange={(e) => setResourceType(e.target.value)}
                  >
                    {RESOURCE_TYPES.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {activeStep === 1 && (
              <Box sx={{ minHeight: '200px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  选择导出格式
                </Typography>
                <RadioGroup
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'csv' | 'json' | 'excel')}
                >
                  {EXPORT_FORMATS.map((f) => (
                    <FormControlLabel
                      key={f.value}
                      value={f.value}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{f.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({f.value.toUpperCase()})
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </Box>
            )}

            {activeStep === 2 && (
              <Box sx={{ minHeight: '200px' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  可选: 添加筛选条件 (JSON 格式)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="筛选条件 (JSON)"
                  placeholder={'{\n  "from": "2024-01-01",\n  "to": "2024-12-31",\n  "user_id": "user-001"\n}'}
                  value={filtersText}
                  onChange={(e) => setFiltersText(e.target.value)}
                  error={!!filtersError}
                  helperText={filtersError ?? '留空则导出全部数据'}
                  sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '13px' } }}
                />
              </Box>
            )}

            {exportError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {exportError}
              </Alert>
            )}

            {exporting && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  正在导出数据...
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {isComplete ? (
          <Button onClick={handleClose} variant="contained">
            完成
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={exporting}>
              取消
            </Button>
            <Box sx={{ flex: 1 }} />
            {activeStep > 0 && (
              <Button
                startIcon={<ChevronLeft size={16} />}
                onClick={handleBack}
                disabled={exporting}
              >
                上一步
              </Button>
            )}
            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<ChevronRight size={16} />}
                onClick={handleNext}
                disabled={exporting}
              >
                下一步
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? '导出中...' : '开始导出'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExportWizard;
