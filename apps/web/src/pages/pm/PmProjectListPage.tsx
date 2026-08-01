import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { FolderKanban, Eye, Edit } from 'lucide-react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { DataExport, PageContainer } from '@/components/common';
import { projectSchema } from '@/schemas/pm';
import { pmApi } from '@/api/pm';
import type { Project } from '@/api/pm';
import { PM_PATHS } from '@/modules/pm/config';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const projectApiAdapter: CrudApiAdapter<Project> = {
  list: async (params) => {
    const response = await pmApi.projects.list({
      project_type: (params?.project_type as string) || undefined,
      status: (params?.status as string) || undefined,
      page: params?.page,
      pagesize: params?.pageSize,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载项目列表失败');
    }
    return {
      data: (response.data.projects || []) as unknown as Project[],
      total: response.data.total_count || 0,
    };
  },
  create: async (data) => {
    const response = await pmApi.projects.create(
      data as Parameters<typeof pmApi.projects.create>[0]
    );
    if (!response.success) {
      throw new Error(response.message || '创建项目失败');
    }
    return (response.data ?? data) as Project;
  },
  update: async (id, data) => {
    const response = await pmApi.projects.update(
      id,
      data as Parameters<typeof pmApi.projects.update>[1]
    );
    if (!response.success) {
      throw new Error(response.message || '更新项目失败');
    }
    return { ...(data as Project), id } as Project;
  },
  delete: async (id) => {
    const response = await pmApi.projects.delete(id);
    if (!response.success) {
      throw new Error(response.message || '删除项目失败');
    }
  },
};

const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row) => {
          const id = String(row.id);
          if (id) {
            navigate(`${PM_PATHS.projects}/${id}`);
          }
        },
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => {
          const id = String(row.id);
          if (id) {
            navigate(`${PM_PATHS.projects}/${id}/edit`);
          }
        },
      },
    ],
    [navigate]
  );

  const headerContent = React.useCallback((rows: Project[]) => {
    const activeCount = rows.filter((r) => r.status === 'active').length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const completedCount = rows.filter((r) => r.status === 'completed').length;

    return (
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'grey.600' }}>项目总数</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 700 }}>{rows.length}</Box>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'success.dark' }}>进行中</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'success.dark' }}>
              {activeCount}
            </Box>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'warning.dark' }}>待审批</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'warning.dark' }}>
              {pendingCount}
            </Box>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'primary.dark' }}>已完成</Box>
            <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'primary.dark' }}>
              {completedCount}
            </Box>
          </Box>
        </Box>
        <DataExport
          data={rows as unknown as Record<string, unknown>[]}
          fields={[
            { key: 'name', title: '项目名称' },
            { key: 'code', title: '项目编码' },
            { key: 'project_type', title: '项目类型' },
            { key: 'status', title: '状态' },
            { key: 'progress', title: '进度' },
            { key: 'budget', title: '预算' },
            { key: 'start_date', title: '开始日期' },
            { key: 'end_date', title: '结束日期' },
          ]}
          defaultFileName='项目数据'
          buttonText='导出'
        />
      </Box>
    );
  }, []);

  return (
    <PageContainer
      title='项目管理'
      subtitle='管理所有类型的项目，跟踪进度和状态'
      headerProps={{
        pageIcon: <FolderKanban style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={projectSchema}
        apiAdapter={projectApiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目' }]}
      />
    </PageContainer>
  );
};

export default PmProjectListPage;
