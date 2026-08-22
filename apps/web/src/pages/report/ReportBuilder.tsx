import { designTokens } from '@topems/tokens';
import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Columns,
  FileSpreadsheet,
  File,
  FileJson,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import i18n from '@/i18n';
import { Box, Typography, TextField, Checkbox, Button } from '@mui/material';
import { PageContainer } from '@/components/common';
import type { ReportTypeInfo, ReportType, ExportFormat, CreateReportRequest } from '@/api/report';
import { logger } from '@/utils/logger';

interface ReportBuilderProps {
  onClose?: () => void;
  reportTypes?: ReportTypeInfo[];
  onSuccess?: () => void;
  isModal?: boolean;
}

const DEFAULT_REPORT_TYPES: ReportTypeInfo[] = [
  { type: 'rs_project_progress', name: i18n.t('pages.report_builder.k0'), module: 'RS' },
  { type: 'rs_experiment_record', name: i18n.t('pages.report_builder.k1'), module: 'RS' },
  { type: 'lims_inspection_stats', name: i18n.t('pages.report_builder.k2'), module: 'LIMS' },
  { type: 'lims_sample_summary', name: i18n.t('pages.report_builder.k3'), module: 'LIMS' },
  { type: 'qms_quality_analysis', name: i18n.t('pages.report_builder.k4'), module: 'QMS' },
  { type: 'qms_defect_stats', name: i18n.t('pages.report_builder.k5'), module: 'QMS' },
  { type: 'ehs_safety_check', name: i18n.t('pages.report_builder.k6'), module: 'EHS' },
  { type: 'ehs_risk_assessment', name: i18n.t('pages.report_builder.k7'), module: 'EHS' },
  { type: 'srm_supplier_eval', name: i18n.t('pages.report_builder.k8'), module: 'SRM' },
  { type: 'srm_purchase_stats', name: i18n.t('pages.report_builder.k9'), module: 'SRM' },
  { type: 'pdm_production_stats', name: i18n.t('pages.report_builder.k10'), module: 'PDM' },
  { type: 'pdm_process_summary', name: i18n.t('pages.report_builder.k11'), module: 'PDM' },
];

function getReportColumns(): Record<ReportType, string[]> {
  return {
    rs_project_progress: [
      i18n.t('pages.report_builder.k17'),
      i18n.t('pages.report_builder.k16'),
      i18n.t('pages.report_builder.k15'),
      i18n.t('pages.report_builder.k14'),
      i18n.t('pages.report_builder.k13'),
      i18n.t('pages.report_builder.k12'),
    ],
    rs_experiment_record: [
      i18n.t('pages.report_builder.k24'),
      i18n.t('pages.report_builder.k23'),
      i18n.t('pages.report_builder.k22'),
      i18n.t('pages.report_builder.k21'),
      i18n.t('pages.report_builder.k20'),
      i18n.t('pages.report_builder.k19'),
      i18n.t('pages.report_builder.k18'),
    ],
    lims_inspection_stats: [
      i18n.t('pages.report_builder.k30'),
      i18n.t('pages.report_builder.k29'),
      i18n.t('pages.report_builder.k28'),
      i18n.t('pages.report_builder.k27'),
      i18n.t('pages.report_builder.k26'),
      i18n.t('pages.report_builder.k25'),
    ],
    lims_sample_summary: [
      i18n.t('pages.report_builder.k36'),
      i18n.t('pages.report_builder.k35'),
      i18n.t('pages.report_builder.k34'),
      i18n.t('pages.report_builder.k33'),
      i18n.t('pages.report_builder.k32'),
      i18n.t('pages.report_builder.k31'),
    ],
    qms_quality_analysis: [
      i18n.t('pages.report_builder.k42'),
      i18n.t('pages.report_builder.k41'),
      i18n.t('pages.report_builder.k40'),
      i18n.t('pages.report_builder.k39'),
      i18n.t('pages.report_builder.k38'),
      i18n.t('pages.report_builder.k37'),
    ],
    qms_defect_stats: [
      i18n.t('pages.report_builder.k48'),
      i18n.t('pages.report_builder.k47'),
      i18n.t('pages.report_builder.k46'),
      i18n.t('pages.report_builder.k45'),
      i18n.t('pages.report_builder.k44'),
      i18n.t('pages.report_builder.k43'),
    ],
    ehs_safety_check: [
      i18n.t('pages.report_builder.k54'),
      i18n.t('pages.report_builder.k53'),
      i18n.t('pages.report_builder.k52'),
      i18n.t('pages.report_builder.k51'),
      i18n.t('pages.report_builder.k50'),
      i18n.t('pages.report_builder.k49'),
    ],
    ehs_risk_assessment: [
      i18n.t('pages.report_builder.k60'),
      i18n.t('pages.report_builder.k59'),
      i18n.t('pages.report_builder.k58'),
      i18n.t('pages.report_builder.k57'),
      i18n.t('pages.report_builder.k56'),
      i18n.t('pages.report_builder.k55'),
    ],
    srm_supplier_eval: [
      i18n.t('pages.report_builder.k66'),
      i18n.t('pages.report_builder.k65'),
      i18n.t('pages.report_builder.k64'),
      i18n.t('pages.report_builder.k63'),
      i18n.t('pages.report_builder.k62'),
      i18n.t('pages.report_builder.k61'),
    ],
    srm_purchase_stats: [
      i18n.t('pages.report_builder.k72'),
      i18n.t('pages.report_builder.k71'),
      i18n.t('pages.report_builder.k70'),
      i18n.t('pages.report_builder.k69'),
      i18n.t('pages.report_builder.k68'),
      i18n.t('pages.report_builder.k67'),
    ],
    pdm_production_stats: [
      i18n.t('pages.report_builder.k78'),
      i18n.t('pages.report_builder.k77'),
      i18n.t('pages.report_builder.k76'),
      i18n.t('pages.report_builder.k75'),
      i18n.t('pages.report_builder.k74'),
      i18n.t('pages.report_builder.k73'),
    ],
    pdm_process_summary: [
      i18n.t('pages.report_builder.k84'),
      i18n.t('pages.report_builder.k83'),
      i18n.t('pages.report_builder.k82'),
      i18n.t('pages.report_builder.k81'),
      i18n.t('pages.report_builder.k80'),
      i18n.t('pages.report_builder.k79'),
    ],
  };
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onClose = () => {},
  reportTypes = DEFAULT_REPORT_TYPES,
  onSuccess = () => {},
  isModal = true,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reportType: '' as ReportType | '',
    format: 'excel' as ExportFormat,
    startDate: '',
    endDate: '',
    selectedColumns: [] as string[],
  });
  const [filters, _setFilters] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleReportTypeChange = (type: ReportType) => {
    const defaultColumns = getReportColumns()[type] || [];
    setFormData((prev) => ({
      ...prev,
      reportType: type,
      selectedColumns: defaultColumns,
    }));
    setErrors((prev) => ({ ...prev, reportType: '' }));
  };

  const handleColumnToggle = (column: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(column)
        ? prev.selectedColumns.filter((c) => c !== column)
        : [...prev.selectedColumns, column],
    }));
  };

  const handleSelectAllColumns = () => {
    if (formData.reportType) {
      const allColumns = getReportColumns()[formData.reportType as ReportType] || [];
      setFormData((prev) => ({ ...prev, selectedColumns: allColumns }));
    }
  };

  const handleDeselectAllColumns = () => {
    setFormData((prev) => ({ ...prev, selectedColumns: [] }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = i18n.t('pages.report_builder.k85');
    }

    if (!formData.reportType) {
      newErrors.reportType = i18n.t('pages.report_builder.k86');
    }

    if (formData.selectedColumns.length === 0) {
      newErrors.selectedColumns = i18n.t('pages.report_builder.k87');
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.dateRange = i18n.t('pages.report_builder.k88');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const request: CreateReportRequest = {
        config: {
          report_type: formData.reportType as ReportType,
          format: formData.format,
          title: formData.title,
          description: formData.description,
          columns: formData.selectedColumns,
          date_range:
            formData.startDate && formData.endDate
              ? { start_date: formData.startDate, end_date: formData.endDate }
              : undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        },
      };

      logger.info(i18n.t('pages.report_builder.k0'), request);
      onSuccess();
    } catch (err: unknown) {
      logger.error(i18n.t('pages.report_builder.k1'), err);
      setErrors({ submit: i18n.t('pages.report_builder.k89') });
    } finally {
      setSubmitting(false);
    }
  };

  const availableColumns = formData.reportType
    ? getReportColumns()[formData.reportType as ReportType] || []
    : [];

  const renderHeader = () => (
    <Box
      sx={{
        background: 'linear-gradient(135deg, primary.main 0%, primary.light 100%)',
        color: 'common.white',
        p: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileText sx={{ width: 24, height: 24 }} />
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {i18n.t('pages.report_builder.k0')}
          </Typography>
        </Box>
        {isModal && (
          <Button
            onClick={onClose}
            sx={{
              p: 1,
              color: 'common.white',
              '&:hover': { bgcolor: 'action.disabledBackground' },
              borderRadius: 3,
              minWidth: 'auto',
            }}
          >
            <X sx={{ width: 24, height: 24 }} />
          </Button>
        )}
      </Box>
      <Typography sx={{ color: 'primary.light', fontSize: 14, mt: 1 }}>
        {i18n.t('pages.report_builder.k1')}
      </Typography>
    </Box>
  );

  const renderForm = () => (
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText sx={{ width: 20, height: 20, color: 'primary.main', mr: 1 }} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.report_builder.k2')}
          </Typography>
        </Box>

        <Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, mb: 1, color: 'grey.700' }}
          >
            {i18n.t('pages.report_builder.k0')}{' '}
            <Typography
              component='span'
              sx={{ color: 'error.main' }}
            >
              *
            </Typography>
          </Typography>
          <TextField
            fullWidth
            size='small'
            value={formData.title}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, title: e.target.value }));
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder={i18n.t('pages.report_builder.2024q1_90')}
            error={!!errors.title}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                '&.Mui-error': { borderColor: 'error.main' },
              },
            }}
          />
          {errors.title && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mt: 0.5,
                color: 'error.main',
                fontSize: 14,
              }}
            >
              <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
              {errors.title}
            </Box>
          )}
        </Box>

        <Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, mb: 1, color: 'grey.700' }}
          >
            {i18n.t('pages.report_builder.k3')}
          </Typography>
          <TextField
            fullWidth
            size='small'
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder={i18n.t('pages.report_builder.k91')}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Columns sx={{ width: 20, height: 20, color: 'secondary.main', mr: 1 }} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.report_builder.k1')}{' '}
            <Typography
              component='span'
              sx={{ color: 'error.main' }}
            >
              *
            </Typography>
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {reportTypes.map((type) => (
            <Box
              key={type.type}
              onClick={() => handleReportTypeChange(type.type)}
              sx={{
                p: 2,
                border: 2,
                borderRadius: 3,
                cursor: 'pointer',
                borderColor: formData.reportType === type.type ? 'primary.main' : 'grey.200',
                bgcolor: formData.reportType === type.type ? 'primary.light' : 'transparent',
                '&:hover': {
                  borderColor: formData.reportType === type.type ? 'primary.main' : 'primary.light',
                },
              }}
            >
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{type.name}</Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.500', mt: 0.5 }}
              >
                {type.module}
              </Typography>
            </Box>
          ))}
        </Box>
        {errors.reportType && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'error.main',
              fontSize: 14,
            }}
          >
            <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
            {errors.reportType}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar sx={{ width: 20, height: 20, color: 'success.main', mr: 1 }} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.report_builder.k4')}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 1, color: 'grey.700' }}
            >
              {i18n.t('pages.report_builder.k5')}
            </Typography>
            <TextField
              type='date'
              fullWidth
              size='small'
              value={formData.startDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 1, color: 'grey.700' }}
            >
              {i18n.t('pages.report_builder.k6')}
            </Typography>
            <TextField
              type='date'
              fullWidth
              size='small'
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </Box>
        </Box>
        {errors.dateRange && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'error.main',
              fontSize: 14,
            }}
          >
            <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
            {errors.dateRange}
          </Box>
        )}
      </Box>

      {availableColumns.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Columns sx={{ width: 20, height: 20, color: 'warning.main', mr: 1 }} />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.report_builder.k2')}{' '}
                <Typography
                  component='span'
                  sx={{ color: 'error.main' }}
                >
                  *
                </Typography>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                onClick={handleSelectAllColumns}
                size='small'
                sx={{
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                {i18n.t('pages.report_builder.k7')}
              </Button>
              <Typography sx={{ color: 'grey.400', lineHeight: `${designTokens.spacing.xl}px` }}>|</Typography>
              <Button
                onClick={handleDeselectAllColumns}
                size='small'
                sx={{
                  color: 'grey.700',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                {i18n.t('pages.report_builder.k8')}
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {availableColumns.map((column) => (
              <Box
                key={column}
                onClick={() => handleColumnToggle(column)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  border: 1,
                  borderRadius: 3,
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                <Checkbox
                  checked={formData.selectedColumns.includes(column)}
                  size='small'
                  sx={{
                    p: 0,
                    mr: 1,
                    color: 'grey.400',
                    '&.Mui-checked': { color: 'primary.main' },
                  }}
                />
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.700' }}
                >
                  {column}
                </Typography>
              </Box>
            ))}
          </Box>
          {errors.selectedColumns && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'error.main',
                fontSize: 14,
              }}
            >
              <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
              {errors.selectedColumns}
            </Box>
          )}
          <Typography
            variant='body2'
            sx={{ color: 'grey.500' }}
          >
            {i18n.t('pages.report_builder.k3')} {formData.selectedColumns.length}{' '}
            {i18n.t('pages.report_builder.k4')}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText sx={{ width: 20, height: 20, color: 'info.main', mr: 1 }} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.report_builder.k9')}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {(['excel', 'pdf', 'csv'] as ExportFormat[]).map((format) => (
            <Box
              key={format}
              onClick={() => setFormData((prev) => ({ ...prev, format }))}
              sx={{
                p: 2,
                border: 2,
                borderRadius: 3,
                cursor: 'pointer',
                borderColor: formData.format === format ? 'primary.main' : 'grey.200',
                bgcolor: formData.format === format ? 'primary.light' : 'transparent',
                '&:hover': {
                  borderColor: formData.format === format ? 'primary.main' : 'primary.light',
                },
              }}
            >
              {format === 'excel' && (
                <FileSpreadsheet sx={{ width: 24, height: 24, color: 'green.500', mb: 1 }} />
              )}
              {format === 'pdf' && <File sx={{ width: 24, height: 24, color: 'red.500', mb: 1 }} />}
              {format === 'csv' && (
                <FileJson sx={{ width: 24, height: 24, color: 'blue.500', mb: 1 }} />
              )}
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {format === 'excel' && 'Excel'}
                {format === 'pdf' && 'PDF'}
                {format === 'csv' && 'CSV'}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'grey.500', mt: 0.5 }}
              >
                {format === 'excel' && i18n.t('pages.report_builder.xlsx_2')}
                {format === 'pdf' && i18n.t('pages.report_builder.pdf_3')}
                {format === 'csv' && i18n.t('pages.report_builder.csv_4')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  const renderFooter = () => (
    <Box
      sx={{
        bgcolor: 'grey.100',
        px: 3,
        py: 2,
        borderTop: 1,
        borderColor: 'grey.200',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ fontSize: 14, color: 'grey.600' }}>
          {formData.selectedColumns.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircle
                sx={{
                  width: 16,
                  height: 16,
                  color: 'success.main',
                  mr: 0.5,
                }}
              />
              {i18n.t('pages.report_builder.k5')} {formData.selectedColumns.length}{' '}
              {i18n.t('pages.report_builder.k6')}
              {formData.reportType && (
                <Typography
                  component='span'
                  sx={{ ml: 1, color: 'grey.400' }}
                >
                  ({getReportColumns()[formData.reportType as ReportType]?.length}{' '}
                  {i18n.t('pages.report_builder.k7')}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isModal && (
            <Button
              onClick={onClose}
              disabled={submitting}
              variant='outlined'
              sx={{
                borderRadius: 3,
                borderColor: 'grey.300',
                color: 'grey.700',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              {i18n.t('pages.report_builder.k10')}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant='contained'
            startIcon={
              submitting ? (
                <Loader2
                  sx={{
                    width: 16,
                    height: 16,
                    animation: 'spin 1s linear infinite',
                  }}
                />
              ) : (
                <FileText sx={{ width: 16, height: 16 }} />
              )
            }
            sx={{ borderRadius: 3 }}
          >
            {submitting ? i18n.t('pages.report_builder.k5') : i18n.t('pages.report_builder.k92')}
          </Button>
        </Box>
      </Box>
      {errors.submit && (
        <Box
          sx={{
            mt: 1,
            color: 'error.main',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
          {errors.submit}
        </Box>
      )}
    </Box>
  );

  if (isModal) {
    return (
      <PageContainer
        padding={false}
        maxWidth={false}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'action.active',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          minHeight: 'auto',
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            width: '100%',
            maxWidth: 896,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderHeader()}
          {renderForm()}
          {renderFooter()}
        </Box>
      </PageContainer>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {renderHeader()}
      {renderForm()}
      {renderFooter()}
    </Box>
  );
};

export default ReportBuilder;
