import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState } from 'react';

import type { ProjectTemplate } from './ProjectTemplateCard';
import type { CreateProjectRequest } from '@/api/pm';

interface ProjectTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProjectTemplate | null;
  onConfirm: (data: CreateProjectRequest) => void;
}

const ProjectTemplateModal: React.FC<ProjectTemplateModalProps> = ({
  open,
  onOpenChange,
  template,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    start_date: '',
    budget: template?.default_budget?.toString() || '',
  });

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: '',
        code: '',
        description: template.description,
        start_date: '',
        budget: template.default_budget?.toString() || '',
      });
    }
  }, [template]);

  const handleSubmit = () => {
    if (!formData.name || !formData.code) return;

    onConfirm({
      name: formData.name,
      code: formData.code,
      description: formData.description,
      project_type: template?.project_type || 'general',
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      start_date: formData.start_date || undefined,
    });

    setFormData({
      name: '',
      code: '',
      description: '',
      start_date: '',
      budget: '',
    });
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth='sm'
      fullWidth
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogTitle>{i18n.t('components.project_template_modal.k0')}</DialogTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('components.project_template_modal.k0')}
          </Typography>
          <TextField
            value={template.name}
            disabled
            size='small'
            sx={{ bgcolor: 'grey.100' }}
          />

          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 1 }}
          >
            {i18n.t('components.project_template_modal.k1')}
          </Typography>
          <TextField
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={i18n.t('components.project_template_modal.k1')}
            size='small'
            sx={{ mt: 0.5 }}
          />

          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('components.project_template_modal.k2')}
          </Typography>
          <TextField
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder={i18n.t('components.project_template_modal.k2')}
            size='small'
            sx={{ mt: 0.5 }}
          />

          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('components.project_template_modal.k3')}
          </Typography>
          <TextField
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={i18n.t('components.project_template_modal.k3')}
            size='small'
            sx={{ mt: 0.5 }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.project_template_modal.k4')}
              </Typography>
              <TextField
                type='date'
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                size='small'
                sx={{ mt: 0.5, '& input': { padding: 1 } }}
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.project_template_modal.k5')}
              </Typography>
              <TextField
                type='number'
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder={i18n.t('components.project_template_modal.k4')}
                size='small'
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              py: 3,
              bgcolor: 'grey.100',
              borderRadius: 1,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {template.phases_count}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.project_template_modal.k6')}
              </Typography>
            </Box>
            <Box sx={{ width: '1px', height: 48, bgcolor: 'grey.300' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {template.estimated_days}天
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.project_template_modal.k7')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant='outlined'
              fullWidth
              onClick={() => onOpenChange(false)}
            >
              {i18n.t('components.project_template_modal.k8')}
            </Button>
            <Button
              variant='contained'
              fullWidth
              onClick={handleSubmit}
            >
              {i18n.t('components.project_template_modal.k9')}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectTemplateModal;
