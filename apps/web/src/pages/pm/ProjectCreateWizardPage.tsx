import React, { useState } from 'react';
import { WizardPageTemplate, type WizardStep } from '../../components/templates/WizardPageTemplate';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { CheckCircle2, User, Settings, Calendar, FolderKanban } from 'lucide-react';
import { pmApi, type CreateProjectRequest } from '@/api/pm';
import { useNotificationStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PaperInfo: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
    <Typography
      variant='caption'
      color='text.secondary'
    >
      {title}
    </Typography>
    <Typography
      variant='body2'
      sx={{ mt: 0.5 }}
    >
      {value}
    </Typography>
  </Box>
);

export const ProjectCreateWizardPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const { t } = useTranslation('pm');
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    manager: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    startDate: string;
    endDate: string;
    budget: string;
  }>({
    name: '',
    description: '',
    manager: '',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
  });

  const steps: WizardStep[] = [
    {
      id: 'basic',
      label: t('pm.project_create_wizard_page.k0'),
      description: t('pm.project_create_wizard_page.k1'),
      icon: <FolderKanban style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label={t('pm.project_create_wizard_page.k2')}
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label={t('pm.project_create_wizard_page.k3')}
            multiline
            rows={3}
            fullWidth
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Box>
      ),
      validation: () => {
        return formData.name.trim().length >= 2;
      },
    },
    {
      id: 'manager',
      label: t('pm.project_create_wizard_page.k4'),
      description: t('pm.project_create_wizard_page.k5'),
      icon: <User style={{ width: 18, height: 18 }} />,
      optional: false,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl
            fullWidth
            required
          >
            <InputLabel>{t('pm.project_create_wizard_page.k6')}</InputLabel>
            <Select
              label={t('pm.project_create_wizard_page.k7')}
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
            >
              <MenuItem value='zhang'>{t('pm.project_create_wizard_page.k8')}</MenuItem>
              <MenuItem value='li'>{t('pm.project_create_wizard_page.k9')}</MenuItem>
              <MenuItem value='wang'>{t('pm.project_create_wizard_page.k10')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{t('pm.project_create_wizard_page.k11')}</InputLabel>
            <Select
              label={t('pm.project_create_wizard_page.k12')}
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                })
              }
            >
              <MenuItem value='low'>{i18n.t('pages.project_create_wizard_page.k0')}</MenuItem>
              <MenuItem value='medium'>{i18n.t('pages.project_create_wizard_page.k1')}</MenuItem>
              <MenuItem value='high'>{i18n.t('pages.project_create_wizard_page.k2')}</MenuItem>
              <MenuItem value='urgent'>{t('pm.project_create_wizard_page.k13')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      ),
    },
    {
      id: 'timeline',
      label: t('pm.project_create_wizard_page.k14'),
      description: t('pm.project_create_wizard_page.k15'),
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      skipable: true,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label={t('pm.project_create_wizard_page.k16')}
            type='date'
            fullWidth
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
          <TextField
            label={t('pm.project_create_wizard_page.k17')}
            type='date'
            fullWidth
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </Box>
      ),
    },
    {
      id: 'budget',
      label: t('pm.project_create_wizard_page.k18'),
      description: t('pm.project_create_wizard_page.k19'),
      icon: <Settings style={{ width: 18, height: 18 }} />,
      skipable: true,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label={t('pm.project_create_wizard_page.k20')}
            type='number'
            fullWidth
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('pages.project_create_wizard_page.k3')}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'summary',
      label: t('pm.project_create_wizard_page.k21'),
      description: t('pm.project_create_wizard_page.k22'),
      icon: <CheckCircle2 style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PaperInfo
            title={t('pm.project_create_wizard_page.k23')}
            value={formData.name || t('pm.project_create_wizard_page.k24')}
          />
          <PaperInfo
            title={t('pm.project_create_wizard_page.k25')}
            value={formData.description || t('pm.project_create_wizard_page.k26')}
          />
          <PaperInfo
            title={t('pm.project_create_wizard_page.k27')}
            value={
              formData.manager
                ? formData.manager === 'zhang'
                  ? t('pm.project_create_wizard_page.k28')
                  : formData.manager === 'li'
                    ? t('pm.project_create_wizard_page.k29')
                    : t('pm.project_create_wizard_page.k30')
                : t('pm.project_create_wizard_page.k31')
            }
          />
          <PaperInfo
            title={t('pm.project_create_wizard_page.k32')}
            value={
              {
                low: t('pm.project_create_wizard_page.k37'),
                medium: t('pm.project_create_wizard_page.k33'),
                high: t('pm.project_create_wizard_page.k35'),
                urgent: t('pm.project_create_wizard_page.k34'),
              }[formData.priority] || t('pm.project_create_wizard_page.k36')
            }
          />
          <PaperInfo
            title={t('pm.project_create_wizard_page.k38')}
            value={formData.startDate || t('pm.project_create_wizard_page.k39')}
          />
          <PaperInfo
            title={t('pm.project_create_wizard_page.k40')}
            value={formData.endDate || t('pm.project_create_wizard_page.k41')}
          />
          <PaperInfo
            title={t('pm.project_create_wizard_page.k42')}
            value={
              formData.budget
                ? `${formData.budget}${i18n.t('pages.project_create_wizard_page.k0')}`
                : t('pm.project_create_wizard_page.k43')
            }
          />
        </Box>
      ),
    },
  ];

  const handleComplete = async () => {
    try {
      const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
      const requestData: CreateProjectRequest = {
        name: formData.name,
        code: `PRJ-${Date.now()}`,
        description: formData.description || undefined,
        project_type: 'standard',
        leader: formData.manager || undefined,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        budget: formData.budget ? Number(formData.budget) : undefined,
        priority: priorityMap[formData.priority] || 2,
      };

      const response = await pmApi.projects.create(requestData);
      if (response.success) {
        addNotification({
          type: 'success',
          title: t('pm.project_create_wizard_page.k45'),
          message: t('pm.project_create_wizard_page.k44'),
        });
        navigate('/pm/projects');
      } else {
        addNotification({
          type: 'error',
          title: t('pm.project_create_wizard_page.k46'),
          message: response.message || t('pm.project_create_wizard_page.k47'),
        });
      }
    } catch {
      addNotification({
        type: 'error',
        title: t('pm.project_create_wizard_page.k49'),
        message: t('pm.project_create_wizard_page.k48'),
      });
    }
  };

  const handleCancel = () => {
    navigate('/pm/projects');
  };

  return (
    <WizardPageTemplate
      title={t('pm.project_create_wizard_page.k50')}
      subtitle={t('pm.project_create_wizard_page.k51')}
      steps={steps}
      onComplete={handleComplete}
      onCancel={handleCancel}
      showStepNumbers
      showProgress
      showNavigation
      finishButtonText={t('pm.project_create_wizard_page.k52')}
    />
  );
};

export default ProjectCreateWizardPage;
