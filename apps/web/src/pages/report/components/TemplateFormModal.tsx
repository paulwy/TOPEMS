import React, { useState } from 'react';
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
  Button,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { type Template, type TemplateCategory, type CreateTemplateRequest } from '@/api/template';

interface TemplateFormModalProps {
  template?: Template;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest) => void;
  categories: TemplateCategory[];
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  template,
  onClose,
  onSubmit,
  categories,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    code: template?.code || '',
    category_id: template?.category_id,
    module: template?.module || '',
    description: template?.description || '',
    content: template?.content || '',
    variables: template?.variables || [],
    isactive: template?.isactive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='md'
      fullWidth
      slotProps={{
        paper: { sx: { maxHeight: '90vh' } },
      }}
    >
      <DialogTitle>
        {template
          ? ` + ${t('report.template_management_page.edit_title')}`
          : t('report.template_management_page.create_title')}
      </DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label={t('report.template_management_page.name_label')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder={t('report.template_management_page.name_placeholder')}
              size='small'
            />
            <TextField
              label={t('report.template_management_page.code_label')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder={t('report.template_management_page.code_placeholder')}
              size='small'
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl
              size='small'
              required
            >
              <InputLabel>{t('report.template_management_page.category_label_field')}</InputLabel>
              <Select
                value={formData.category_id || ''}
                label={t('report.template_management_page.category_label_field')}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <MenuItem value=''>
                  {t('report.template_management_page.category_placeholder')}
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem
                    key={cat.id}
                    value={cat.id}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size='small'
              required
            >
              <InputLabel>{t('report.template_management_page.module_label_field')}</InputLabel>
              <Select
                value={formData.module}
                label={t('report.template_management_page.module_label_field')}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              >
                <MenuItem value=''>
                  {t('report.template_management_page.module_placeholder')}
                </MenuItem>
                <MenuItem value='ERP'>ERP</MenuItem>
                <MenuItem value='HRM'>HRM</MenuItem>
                <MenuItem value='CRM'>CRM</MenuItem>
                <MenuItem value='QMS'>QMS</MenuItem>
                <MenuItem value='LIMS'>LIMS</MenuItem>
                <MenuItem value='Other'>{t('report.template_management_page.other')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label={t('report.template_management_page.description_label')}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            placeholder={t('report.template_management_page.description_placeholder')}
            size='small'
          />

          <TextField
            label={t('report.template_management_page.content_label')}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            multiline
            rows={10}
            placeholder={t('report.template_management_page.content_placeholder')}
            size='small'
            sx={{ fontFamily: 'monospace' }}
          />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {t('report.template_management_page.content_helper')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('report.template_management_page.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
        >
          {template
            ? ` + ${t('report.template_management_page.save')}`
            : t('report.template_management_page.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateFormModal;
