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
import { designTokens } from '@topems/tokens';
import {
  auditApi,
  EXPORT_FORMATS,
  RESOURCE_TYPES,
  type ExportResult,
} from '../api/audit';
import { zh } from '../i18n/zh';

interface ExportWizardProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [zh['exportWizard.stepSelectResource'], zh['exportWizard.stepSelectFormat'], zh['exportWizard.stepConfigFilters']];

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
        setFiltersError(zh['exportWizard.filtersMustBeJsonObject']);
        return null;
      }
      setFiltersError(null);
      return parsed as Record<string, unknown>;
    } catch {
      setFiltersError(zh['exportWizard.filtersJsonError']);
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
      const message = err instanceof Error ? err.message : zh['exportWizard.exportFailed'];
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
        {zh['exportWizard.title']}
      </DialogTitle>
      <DialogContent>
        {isComplete ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle size={56} color={designTokens.colors.success.main} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {zh['exportWizard.exportSuccess']}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {zh['exportWizard.resourceTypeLabel']}{RESOURCE_TYPES.find((r) => r.value === resourceType)?.label}
              {'  |  '}
              {zh['exportWizard.formatLabel']}{FORMAT_ICONS[format] ?? format}
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
                  {zh['exportWizard.selectResourceType']}
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>{zh['exportWizard.resourceType']}</InputLabel>
                  <Select
                    value={resourceType}
                    label={zh['exportWizard.resourceType']}
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
                  {zh['exportWizard.selectFormat']}
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
                  {zh['exportWizard.optionalFilters']}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={zh['exportWizard.filtersLabel']}
                  placeholder={'{\n  "from": "2024-01-01",\n  "to": "2024-12-31",\n  "user_id": "user-001"\n}'}
                  value={filtersText}
                  onChange={(e) => setFiltersText(e.target.value)}
                  error={!!filtersError}
                  helperText={filtersError ?? zh['exportWizard.filtersHelper']}
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
                  {zh['exportWizard.exporting']}
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {isComplete ? (
          <Button onClick={handleClose} variant="contained">
            {zh['exportWizard.done']}
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={exporting}>
              {zh['exportWizard.cancel']}
            </Button>
            <Box sx={{ flex: 1 }} />
            {activeStep > 0 && (
              <Button
                startIcon={<ChevronLeft size={16} />}
                onClick={handleBack}
                disabled={exporting}
              >
                {zh['exportWizard.back']}
              </Button>
            )}
            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<ChevronRight size={16} />}
                onClick={handleNext}
                disabled={exporting}
              >
                {zh['exportWizard.next']}
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? zh['exportWizard.exportingCta'] : zh['exportWizard.startExport']}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExportWizard;
