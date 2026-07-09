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
import { CheckCircle2, User, Settings, Calendar, FolderKanban } from 'lucide-react';

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
      label: '基本信息',
      description: '填写项目名称和描述',
      icon: <FolderKanban style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label='项目名称'
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label='项目描述'
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
      label: '负责人配置',
      description: '选择项目负责人和团队',
      icon: <User style={{ width: 18, height: 18 }} />,
      optional: false,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl
            fullWidth
            required
          >
            <InputLabel>项目负责人</InputLabel>
            <Select
              label='项目负责人'
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
            >
              <MenuItem value='zhang'>张三</MenuItem>
              <MenuItem value='li'>李四</MenuItem>
              <MenuItem value='wang'>王五</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>优先级</InputLabel>
            <Select
              label='优先级'
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                })
              }
            >
              <MenuItem value='low'>低</MenuItem>
              <MenuItem value='medium'>中</MenuItem>
              <MenuItem value='high'>高</MenuItem>
              <MenuItem value='urgent'>紧急</MenuItem>
            </Select>
          </FormControl>
        </Box>
      ),
    },
    {
      id: 'timeline',
      label: '时间计划',
      description: '设置项目起止日期',
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      skipable: true,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label='开始日期'
            type='date'
            fullWidth
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
          <TextField
            label='预计结束日期'
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
      label: '预算配置',
      description: '设置项目预算',
      icon: <Settings style={{ width: 18, height: 18 }} />,
      skipable: true,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label='项目预算（元）'
            type='number'
            fullWidth
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            预算设置为可选，后续可以在项目详情中修改
          </Typography>
        </Box>
      ),
    },
    {
      id: 'summary',
      label: '确认信息',
      description: '确认项目信息无误后提交',
      icon: <CheckCircle2 style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PaperInfo
            title='项目名称'
            value={formData.name || '未填写'}
          />
          <PaperInfo
            title='项目描述'
            value={formData.description || '未填写'}
          />
          <PaperInfo
            title='负责人'
            value={
              formData.manager
                ? formData.manager === 'zhang'
                  ? '张三'
                  : formData.manager === 'li'
                    ? '李四'
                    : '王五'
                : '未填写'
            }
          />
          <PaperInfo
            title='优先级'
            value={
              { low: '低', medium: '中', high: '高', urgent: '紧急' }[formData.priority] || '中'
            }
          />
          <PaperInfo
            title='开始日期'
            value={formData.startDate || '未填写'}
          />
          <PaperInfo
            title='结束日期'
            value={formData.endDate || '未填写'}
          />
          <PaperInfo
            title='预算'
            value={formData.budget ? `${formData.budget} 元` : '未设置'}
          />
        </Box>
      ),
    },
  ];

  const handleComplete = () => {
    console.log('Project created:', formData);
  };

  const handleCancel = () => {
    console.log('Wizard cancelled');
  };

  return (
    <WizardPageTemplate
      title='新建项目向导'
      subtitle='引导式创建项目，逐步完善项目信息'
      steps={steps}
      onComplete={handleComplete}
      onCancel={handleCancel}
      showStepNumbers
      showProgress
      showNavigation
      finishButtonText='创建项目'
    />
  );
};

export default ProjectCreateWizardPage;
