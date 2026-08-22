import { designTokens } from '@topems/tokens';
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Card,
  Chip,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Template } from '@/api/template';

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '90vh' } },
      }}
    >
      <DialogTitle>{t('report.template_management_page.preview_title')}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            {template.name}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              color: 'text.secondary',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            <Typography variant='body2'>
              {t('report.template_management_page.preview_code', { code: template.code })}
            </Typography>
            <Typography variant='body2'>
              {t('report.template_management_page.preview_category', {
                name: template.category_name || '',
              })}
            </Typography>
            <Typography variant='body2'>
              {t('report.template_management_page.module_label', { module: template.module })}
            </Typography>
          </Box>
          {template.description && (
            <Typography
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {template.description}
            </Typography>
          )}
        </Box>

        <Card sx={{ bgcolor: 'grey.50', p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 'semibold', mb: 1 }}>
            {t('report.template_management_page.content_label')}
          </Typography>
          <Box
            component='pre'
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              color: 'text.secondary',
            }}
          >
            {template.content}
          </Box>
        </Card>

        {template.variables && template.variables.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 'semibold', mb: 1 }}>
              {t('report.template_management_page.preview_variables')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {template.variables.map((variable, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                    {'{{'}
                    {variable.key}
                    {'}}'}
                  </Typography>
                  <Typography color='text.secondary'>{variable.label}</Typography>
                  <Chip
                    label={variable.type}
                    size='small'
                    sx={{ fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}
                  />
                  {variable.required && (
                    <Typography sx={{ color: 'error.main', fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}>
                      {t('report.template_management_page.required')}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('report.template_management_page.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplatePreviewModal;
