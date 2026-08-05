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

const PmTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => pmApi.projects.create(data),
    onSuccess: (response) => {
      if (response.success) {
        navigate(PM_PATHS.projects);
      }
    },
    onError: (err: unknown) => {
      logger.error('Failed to create project:', err);
      addNotification({ title: '错误', message: '创建项目失败', type: 'error' });
    },
  });

  const templates: ProjectTemplate[] = [
    {
      id: '1',
      name: '研发项目模板',
      description:
        '适用于软件研发、产品开发等技术类项目，包含需求分析、设计、开发、测试、上线等阶段',
      project_type: 'research',
      icon: 'code',
      phases_count: 5,
      estimated_days: 90,
      default_budget: 500000,
      tags: ['研发', '技术', '敏捷'],
    },
    {
      id: '2',
      name: '施工项目模板',
      description: '适用于建筑施工、基础设施建设等工程项目，包含规划、设计、施工、验收等阶段',
      project_type: 'construction',
      icon: 'building',
      phases_count: 6,
      estimated_days: 180,
      default_budget: 2000000,
      tags: ['施工', '建筑', '工程'],
    },
    {
      id: '3',
      name: '设计项目模板',
      description: '适用于产品设计、UI设计、品牌设计等创意项目，包含调研、概念设计、方案确认等阶段',
      project_type: 'design',
      icon: 'palette',
      phases_count: 4,
      estimated_days: 45,
      default_budget: 100000,
      tags: ['设计', '创意', '品牌'],
    },
    {
      id: '4',
      name: '市场推广模板',
      description: '适用于市场活动、营销推广、品牌宣传等项目，包含策划、执行、监测、评估等阶段',
      project_type: 'service',
      icon: 'trending-up',
      phases_count: 4,
      estimated_days: 30,
      default_budget: 80000,
      tags: ['市场', '营销', '推广'],
    },
    {
      id: '5',
      name: '生产项目模板',
      description: '适用于产品生产、批量制造等项目，包含工艺设计、采购、生产、质检等阶段',
      project_type: 'production',
      icon: 'factory',
      phases_count: 5,
      estimated_days: 120,
      default_budget: 800000,
      tags: ['生产', '制造', '工艺'],
    },
    {
      id: '6',
      name: '培训项目模板',
      description:
        '适用于员工培训、技能提升、知识普及等项目，包含需求分析、课程设计、实施评估等阶段',
      project_type: 'service',
      icon: 'graduation-cap',
      phases_count: 4,
      estimated_days: 60,
      default_budget: 50000,
      tags: ['培训', '教育', '学习'],
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
            label: '新建项目',
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
            placeholder='搜索模板名称、类型或标签...'
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
            <Typography sx={{ color: 'text.secondary' }}>未找到匹配的模板</Typography>
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
