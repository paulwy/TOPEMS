import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Typography,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import type {
  ReportType,
  ReportTypeInfo,
  ReportTemplate,
  CreateTemplateRequest,
} from '@/api/report';

interface TemplateFormDialogProps {
  open: boolean;
  selectedTemplate: ReportTemplate | null;
  templateFormData: CreateTemplateRequest;
  mockReportTypes: ReportTypeInfo[];
  onClose: () => void;
  onFormDataChange: (data: CreateTemplateRequest) => void;
  onSubmit: () => void;
}

const TemplateFormDialog: React.FC<TemplateFormDialogProps> = ({
  open,
  selectedTemplate,
  templateFormData,
  mockReportTypes,
  onClose,
  onFormDataChange,
  onSubmit,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle>{selectedTemplate ? i18n.t('pages.template_form_dialog.k1') : i18n.t('pages.template_form_dialog.k0')}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto', maxHeight: '80vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <TextField
              label={i18n.t('pages.template_form_dialog.k0')}
              required
              value={templateFormData.name}
              onChange={(e) => onFormDataChange({ ...templateFormData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label={i18n.t('pages.template_form_dialog.k1')}
              required
              value={templateFormData.code}
              onChange={(e) => onFormDataChange({ ...templateFormData, code: e.target.value })}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>报表类型 *</InputLabel>
              <Select
                required
                value={templateFormData.report_type}
                label={i18n.t('pages.template_form_dialog.k2')}
                onChange={(e) =>
                  onFormDataChange({
                    ...templateFormData,
                    report_type: e.target.value as ReportType,
                  })
                }
                fullWidth
              >
                {mockReportTypes.map((type) => (
                  <MenuItem
                    key={type.type}
                    value={type.type}
                  >
                    {type.name} ({type.module})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={i18n.t('pages.template_form_dialog.k2')}
              value={templateFormData.category}
              onChange={(e) => onFormDataChange({ ...templateFormData, category: e.target.value })}
              fullWidth
            />
          </Box>

          <TextField
            label={i18n.t('pages.template_form_dialog.k3')}
            value={templateFormData.description || ''}
            onChange={(e) => onFormDataChange({ ...templateFormData, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>{i18n.t('pages.template_form_dialog.k4')}</InputLabel>
              <Select
                value={templateFormData.outputformat}
                label={i18n.t('pages.template_form_dialog.k5')}
                onChange={(e) =>
                  onFormDataChange({ ...templateFormData, outputformat: e.target.value })
                }
                fullWidth
              >
                <MenuItem value='pdf'>PDF</MenuItem>
                <MenuItem value='excel'>Excel</MenuItem>
                <MenuItem value='csv'>CSV</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography>{i18n.t('pages.template_form_dialog.k6')}</Typography>
              <Switch
                checked={selectedTemplate?.isactive ?? true}
                disabled={!!selectedTemplate}
              />
            </Box>
          </Box>

          <TextField
            label={i18n.t('pages.template_form_dialog.k7')}
            value={templateFormData.data_source.query}
            onChange={(e) =>
              onFormDataChange({
                ...templateFormData,
                data_source: { ...templateFormData.data_source, query: e.target.value },
              })
            }
            multiline
            rows={4}
            fullWidth
            placeholder={i18n.t('pages.template_form_dialog.sql_8')}
            sx={{ fontFamily: 'monospace' }}
          />

          <TextField
            label={i18n.t('pages.template_form_dialog.json_9')}
            value={JSON.stringify(templateFormData.columns, null, 2)}
            onChange={(e) => {
              try {
                const columns = JSON.parse(e.target.value);
                onFormDataChange({ ...templateFormData, columns });
              } catch (e) { console.error("[Report] Failed to parse JSON column config", e); }
            }}
            multiline
            rows={4}
            fullWidth
            sx={{ fontFamily: 'monospace' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {i18n.t('pages.template_form_dialog.k3')}
        </Button>
        <Button
          variant='contained'
          onClick={onSubmit}
        >
          {selectedTemplate ? i18n.t('pages.template_form_dialog.k11') : i18n.t('pages.template_form_dialog.k10')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateFormDialog;
