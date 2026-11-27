import React from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './ProjectMasterDetailPage.module.css';
import {
  MasterDetailPageTemplate,
  type MasterColumn,
} from '../../components/templates/MasterDetailPageTemplate';
import { projectApi } from '@/api/pm/project';
import i18n from '@/i18n';
import { Box, Typography, Chip, Divider } from '@mui/material';
import { Calendar, User, DollarSign, Target, CheckCircle } from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  manager: string;
  status: 'active' | 'inactive' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  description?: string;
}

/** 后端 status（draft/active/completed/closed…）→ 前端枚举 */
const normalizeStatus = (s?: string | null): ProjectItem['status'] => {
  switch (s) {
    case 'completed':
      return 'completed';
    case 'inactive':
    case 'closed':
    case 'archived':
      return 'inactive';
    default:
      return 'active'; // draft / active / planning → active
  }
};

const normalizePriority = (p?: string | null): ProjectItem['priority'] => {
  if (p === 'low' || p === 'high' || p === 'urgent') return p;
  return 'medium';
};

const toDate = (iso?: string | null): string => (iso ? iso.slice(0, 10) : '');

interface PmProjectRow {
  id: string;
  name: string;
  leader?: string | null;
  status?: string | null;
  priority?: string | null;
  progress?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  description?: string | null;
}

const toProjectItem = (p: PmProjectRow): ProjectItem => ({
  id: p.id,
  name: p.name,
  manager: p.leader ?? '—',
  status: normalizeStatus(p.status),
  priority: normalizePriority(p.priority),
  progress: p.progress ?? 0,
  startDate: toDate(p.start_date),
  endDate: toDate(p.end_date),
  budget: p.budget ?? 0,
  description: p.description ?? undefined,
});

export const ProjectMasterDetailPage: React.FC = () => {
  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ['pm-projects'],
    queryFn: async () => {
      const res = await projectApi.list({ page: 1, page_size: 100 });
      const rows = (res.data as { data?: { projects?: PmProjectRow[] } }).data?.projects ?? [];
      return rows.map(toProjectItem);
    },
  });
  const columns: MasterColumn<ProjectItem>[] = [
    {
      id: 'name',
      label: i18n.t('pm.project_master_detail_page.k12'),
      width: 'flex',
      minWidth: 150,
    },
    {
      id: 'manager',
      label: i18n.t('pm.project_master_detail_page.k13'),
      width: 100,
    },
    {
      id: 'status',
      label: i18n.t('pm.project_master_detail_page.k14'),
      width: 80,
      align: 'center',
      render: (_value, row) => {
        const statusConfig = {
          active: { label: i18n.t('pm.project_master_detail_page.k15'), color: 'success' as const },
          inactive: {
            label: i18n.t('pm.project_master_detail_page.k16'),
            color: 'warning' as const,
          },
          completed: {
            label: i18n.t('pm.project_master_detail_page.k17'),
            color: 'default' as const,
          },
        };
        const config = statusConfig[row.status];
        return (
          <Chip
            label={config.label}
            size='small'
            color={config.color}
          />
        );
      },
    },
    {
      id: 'progress',
      label: i18n.t('pm.project_master_detail_page.k18'),
      width: 120,
      align: 'right',
      render: (_value, row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.progress}%
        </Typography>
      ),
    },
    {
      id: 'budget',
      label: i18n.t('pm.project_master_detail_page.k19'),
      width: 100,
      align: 'right',
      render: (_value, row) => (
        <Typography variant='body2'>{row.budget.toLocaleString()}</Typography>
      ),
    },
  ];
  const renderDetail = (item: ProjectItem | null) => {
    if (!item) return null;
    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {item.name}
        </Typography>
        {item.description && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 4 }}
          >
            {item.description}
          </Typography>
        )}
        <Divider sx={{ mb: 4 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'primary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User className={styles.il1} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.project_master_detail_page.k0')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.manager}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'success.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target className={styles.il2} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.project_master_detail_page.k1')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.priority === 'low' && i18n.t('pm.project_master_detail_page.k20')}
                  {item.priority === 'medium' && i18n.t('pm.project_master_detail_page.k21')}
                  {item.priority === 'high' && i18n.t('pm.project_master_detail_page.k22')}
                  {item.priority === 'urgent' && i18n.t('pm.project_master_detail_page.k23')}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'info.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar className={styles.il3} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.project_master_detail_page.k2')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.startDate} ~ {item.endDate}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 250px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  bgcolor: 'warning.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign className={styles.il4} />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.project_master_detail_page.k3')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {item.budget.toLocaleString()} {i18n.t('pages.project_master_detail_page.k0')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        <Divider sx={{ my: 4 }} />
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.project_master_detail_page.k4')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{ flex: 1, height: 8, bgcolor: 'grey.200', borderRadius: 4, overflow: 'hidden' }}
          >
            <Box
              sx={{
                width: `${item.progress}%`,
                height: '100%',
                bgcolor: item.status === 'completed' ? 'success.main' : 'primary.main',
                borderRadius: 4,
                transition: 'width 0.3s',
              }}
            />
          </Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}
          >
            {item.progress}%
          </Typography>
        </Box>
        <Divider sx={{ my: 4 }} />
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.project_master_detail_page.k5')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {item.status === 'completed' ? (
            <CheckCircle className={styles.il5} />
          ) : item.status === 'active' ? (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: 'success.main',
                animation: 'pulse 2s infinite',
              }}
            />
          ) : (
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main' }} />
          )}
          <Typography variant='body2'>
            {item.status === 'active' && i18n.t('pm.project_master_detail_page.k24')}
            {item.status === 'inactive' && i18n.t('pm.project_master_detail_page.k25')}
            {item.status === 'completed' && i18n.t('pm.project_master_detail_page.k26')}
          </Typography>
        </Box>
      </Box>
    );
  };
  return (
    <MasterDetailPageTemplate<ProjectItem>
      title={i18n.t('pm.project_master_detail_page.k27')}
      subtitle={i18n.t('pm.project_master_detail_page.k28')}
      items={projects}
      columns={columns}
      getRowId={(item) => item.id}
      renderDetail={renderDetail}
      detailEmptyTitle={i18n.t('pm.project_master_detail_page.k29')}
      detailEmptyDescription={i18n.t('pm.project_master_detail_page.k30')}
      onAdd={() => {}}
      addButtonText={i18n.t('pm.project_master_detail_page.k31')}
      masterWidth={520}
      collapsible
      enableEditMode
    />
  );
};
export default ProjectMasterDetailPage;
