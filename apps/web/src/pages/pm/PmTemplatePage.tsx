import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { useMutation } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, TextField, InputAdornment, Typography, Box } from '@mui/material';
import type { ProjectTemplate } from '@/components/pm/ProjectTemplateCard';
import ProjectTemplateCard from '@/components/pm/ProjectTemplateCard';
import ProjectTemplateModal from '@/components/pm/ProjectTemplateModal';
import { pmApi } from '@/api/pm';
import type { CreateProjectRequest } from '@/api/pm';
import { PageContainer } from '@/components/common';
import { PM_PATHS } from '@/modules/pm/config';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const PmTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => pmApi.projects.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PM.PROJECTS,
        exact: false,
        refetchType: 'active',
      });
      if (response.success) {
        navigate(PM_PATHS.projects);
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to create project:', err);
      addNotification({
        title: i18n.t('pages.pm_template_page.k1'),
        message: i18n.t('pages.pm_template_page.k0'),
        type: 'error',
      });
    },
  });

  const templates: ProjectTemplate[] = [
    {
      id: '1',
      name: i18n.t('pages.pm_template_page.k2'),
      description: i18n.t('pages.pm_template_page.k3'),
      project_type: 'research',
      icon: 'code',
      phases_count: 5,
      estimated_days: 90,
      default_budget: 500000,
      tags: [
        i18n.t('pages.pm_template_page.k6'),
        i18n.t('pages.pm_template_page.k5'),
        i18n.t('pages.pm_template_page.k4'),
      ],
    },
    {
      id: '2',
      name: i18n.t('pages.pm_template_page.k7'),
      description: i18n.t('pages.pm_template_page.k8'),
      project_type: 'construction',
      icon: 'building',
      phases_count: 6,
      estimated_days: 180,
      default_budget: 2000000,
      tags: [
        i18n.t('pages.pm_template_page.k11'),
        i18n.t('pages.pm_template_page.k10'),
        i18n.t('pages.pm_template_page.k9'),
      ],
    },
    {
      id: '3',
      name: i18n.t('pages.pm_template_page.k12'),
      description: i18n.t('pages.pm_template_page.k13'),
      project_type: 'design',
      icon: 'palette',
      phases_count: 4,
      estimated_days: 45,
      default_budget: 100000,
      tags: [
        i18n.t('pages.pm_template_page.k16'),
        i18n.t('pages.pm_template_page.k15'),
        i18n.t('pages.pm_template_page.k14'),
      ],
    },
    {
      id: '4',
      name: i18n.t('pages.pm_template_page.k17'),
      description: i18n.t('pages.pm_template_page.k18'),
      project_type: 'service',
      icon: 'trending-up',
      phases_count: 4,
      estimated_days: 30,
      default_budget: 80000,
      tags: [
        i18n.t('pages.pm_template_page.k21'),
        i18n.t('pages.pm_template_page.k20'),
        i18n.t('pages.pm_template_page.k19'),
      ],
    },
    {
      id: '5',
      name: i18n.t('pages.pm_template_page.k22'),
      description: i18n.t('pages.pm_template_page.k23'),
      project_type: 'production',
      icon: 'factory',
      phases_count: 5,
      estimated_days: 120,
      default_budget: 800000,
      tags: [
        i18n.t('pages.pm_template_page.k26'),
        i18n.t('pages.pm_template_page.k25'),
        i18n.t('pages.pm_template_page.k24'),
      ],
    },
    {
      id: '6',
      name: i18n.t('pages.pm_template_page.k27'),
      description: i18n.t('pages.pm_template_page.k28'),
      project_type: 'service',
      icon: 'graduation-cap',
      phases_count: 4,
      estimated_days: 60,
      default_budget: 50000,
      tags: [
        i18n.t('pages.pm_template_page.k31'),
        i18n.t('pages.pm_template_page.k30'),
        i18n.t('pages.pm_template_page.k29'),
      ],
    },
  ];

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.project_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleCreateProject = (data: CreateProjectRequest) => {
    createProjectMutation.mutate(data);
  };

  return (
    <PageContainer
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: i18n.t('pages.pm_template_page.k32'),
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: () => navigate(PM_PATHS.projectCreate),
            variant: 'contained',
          },
        ],
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <TextField
            type='text'
            placeholder={i18n.t('pages.pm_template_page.k0')}
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            sx={{ width: 400 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {filteredTemplates.map((template) => (
          <ProjectTemplateCard
            key={template.id}
            template={template}
            onSelect={handleSelectTemplate}
          />
        ))}
      </Box>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary' }}>
              {i18n.t('pages.pm_template_page.k33')}
            </Typography>
          </CardContent>
        </Card>
      )}

      <ProjectTemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        template={selectedTemplate}
        onConfirm={handleCreateProject}
      />
    </PageContainer>
  );
};

export default PmTemplatePage;
