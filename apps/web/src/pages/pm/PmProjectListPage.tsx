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
import i18n from '@/i18n';

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
      throw new Error(response.message || i18n.t('pm.pm_project_list_page.k0'));
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
      throw new Error(response.message || i18n.t('pm.pm_project_list_page.k1'));
    }
    return (response.data ?? data) as Project;
  },
  update: async (id, data) => {
    const response = await pmApi.projects.update(
      id,
      data as Parameters<typeof pmApi.projects.update>[1]
    );
    if (!response.success) {
      throw new Error(response.message || i18n.t('pm.pm_project_list_page.k2'));
    }
    return { ...(data as Project), id } as Project;
  },
  delete: async (id) => {
    const response = await pmApi.projects.delete(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('pm.pm_project_list_page.k3'));
    }
  },
};
const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: i18n.t('pm.pm_project_list_page.k4'),
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
        label: i18n.t('pm.pm_project_list_page.k5'),
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
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'grey.600' }}>
              {i18n.t('pm.pm_project_list_page.k6')}
            </Box>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['1.5rem'], fontWeight: 700 }}>{rows.length}</Box>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'success.dark' }}>
              {i18n.t('pm.pm_project_list_page.k7')}
            </Box>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['1.5rem'], fontWeight: 700, color: 'success.dark' }}>
              {activeCount}
            </Box>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'warning.dark' }}>
              {i18n.t('pm.pm_project_list_page.k8')}
            </Box>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['1.5rem'], fontWeight: 700, color: 'warning.dark' }}>
              {pendingCount}
            </Box>
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'primary.dark' }}>
              {i18n.t('pm.pm_project_list_page.k9')}
            </Box>
            <Box sx={{ fontSize: designTokens.typography.fontSize.scale['1.5rem'], fontWeight: 700, color: 'primary.dark' }}>
              {completedCount}
            </Box>
          </Box>
        </Box>
        <DataExport
          data={rows as unknown as Record<string, unknown>[]}
          fields={[
            { key: 'name', title: i18n.t('pm.pm_project_list_page.k10') },
            { key: 'code', title: i18n.t('pm.pm_project_list_page.k11') },
            { key: 'project_type', title: i18n.t('pm.pm_project_list_page.k12') },
            { key: 'status', title: i18n.t('pm.pm_project_list_page.k13') },
            { key: 'progress', title: i18n.t('pm.pm_project_list_page.k14') },
            { key: 'budget', title: i18n.t('pm.pm_project_list_page.k15') },
            { key: 'start_date', title: i18n.t('pm.pm_project_list_page.k16') },
            { key: 'end_date', title: i18n.t('pm.pm_project_list_page.k17') },
          ]}
          defaultFileName={i18n.t('pm.pm_project_list_page.k18')}
          buttonText={i18n.t('pm.pm_project_list_page.k19')}
        />
      </Box>
    );
  }, []);
  return (
    <PageContainer
      title={i18n.t('pm.pm_project_list_page.k20')}
      subtitle={i18n.t('pm.pm_project_list_page.k21')}
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
        breadcrumbs={[
          { label: i18n.t('pm.pm_project_list_page.k23'), href: '/dashboard' },
          { label: i18n.t('pm.pm_project_list_page.k22') },
        ]}
      />
    </PageContainer>
  );
};
export default PmProjectListPage;
