import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { CheckCircle2, Clock, Package, Users } from 'lucide-react';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { resourceSchema } from '@/schemas/pm';
import { pmApi } from '@/api/pm';
import type { ProjectResource, Project } from '@/api/pm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueColor: string;
  bgColor: string;
  icon: React.ReactNode;
  iconColor: string;
}
const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  valueColor,
  bgColor,
  icon,
  iconColor,
}) => (
  <Box
    sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
      boxShadow: 1,
      p: 3,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ p: 1.5, bgcolor: bgColor, borderRadius: '50%' }}>
        {React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
          color: iconColor,
        })}
      </Box>
      <Box>
        <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>{label}</Box>
        <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: valueColor }}>{value}</Box>
      </Box>
    </Box>
  </Box>
);
const PmResourcePage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECTS,
    queryFn: () => pmApi.projects.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const projects = useMemo(() => {
    const data = projectsQuery.data;
    if (!data?.success || !data.data) return [];
    const items = (data.data as { items?: Project[] }).items;
    return items || (data.data as unknown as Project[]) || [];
  }, [projectsQuery.data]);
  const apiAdapter: CrudApiAdapter<ProjectResource> = useMemo(
    () => ({
      list: async (params) => {
        if (!selectedProject) return { data: [], total: 0 };
        const response = await pmApi.resources.list(selectedProject);
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        let items = (response.data as ProjectResource[]) || [];
        if (params?.resource_type && params.resource_type !== 'all') {
          items = items.filter((r) => r.resource_type === params.resource_type);
        }
        if (params?.status && params.status !== 'all') {
          items = items.filter((r) => r.status === params.status);
        }
        if (params?.search) {
          const q = String(params.search).toLowerCase();
          items = items.filter(
            (r) =>
              r.resource_id.toLowerCase().includes(q) ||
              (r.resource_service?.toLowerCase().includes(q) ?? false) ||
              r.resource_type.toLowerCase().includes(q)
          );
        }
        const total = items.length;
        const page = params?.page || 1;
        const pageSize = params?.pageSize || 10;
        const paged = items.slice((page - 1) * pageSize, page * pageSize);
        return { data: paged, total };
      },
      create: async (data) => {
        const response = await pmApi.resources.create(
          selectedProject,
          data as Parameters<typeof pmApi.resources.create>[1]
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('pm.pm_resource_page.k0'));
        }
        return data as ProjectResource;
      },
      update: async (id, data) => {
        const response = await pmApi.resources.update(
          selectedProject,
          id,
          data as Parameters<typeof pmApi.resources.update>[2]
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('pm.pm_resource_page.k1'));
        }
        return { ...(data as ProjectResource), id } as ProjectResource;
      },
      delete: async (id) => {
        const response = await pmApi.resources.delete(selectedProject, id);
        if (!response.success) {
          throw new Error(response.message || i18n.t('pm.pm_resource_page.k2'));
        }
      },
    }),
    [selectedProject]
  );
  const customRowActions: RowAction[] = [
    {
      key: 'release',
      label: i18n.t('pm.pm_resource_page.k3'),
      icon: <CheckCircle2 size={16} />,
      color: 'success',
      show: (row) => row.status === 'in_use',
      onClick: async (row) => {
        const resourceId = String(row.id);
        await pmApi.resources.update(selectedProject, resourceId, { status: 'available' });
      },
    },
  ];
  const headerContent = React.useCallback((rows: ProjectResource[]) => {
    const availableCount = rows.filter((r) => r.status === 'available').length;
    const inUseCount = rows.filter((r) => r.status === 'in_use').length;
    const totalHours = rows.reduce((sum, r) => sum + (r.actual_hours || 0), 0);
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label={i18n.t('pm.pm_resource_page.k4')}
          value={rows.length}
          valueColor='grey.900'
          bgColor='primary.100'
          icon={<Package size={24} />}
          iconColor='primary.dark'
        />
        <StatCard
          label={i18n.t('pm.pm_resource_page.k5')}
          value={availableCount}
          valueColor='success.dark'
          bgColor='success.light'
          icon={<CheckCircle2 size={24} />}
          iconColor='success.dark'
        />
        <StatCard
          label={i18n.t('pm.pm_resource_page.k6')}
          value={inUseCount}
          valueColor='warning.dark'
          bgColor='warning.light'
          icon={<Users size={24} />}
          iconColor={ct.yellow[600]}
        />
        <StatCard
          label={i18n.t('pm.pm_resource_page.k7')}
          value={`${totalHours.toFixed(0)}h`}
          valueColor='secondary.dark'
          bgColor={ct.purple[200]}
          icon={<Clock size={24} />}
          iconColor={ct.purple[700]}
        />
      </Box>
    );
  }, []);
  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <FormControl
          size='small'
          sx={{ minWidth: 320 }}
        >
          <InputLabel>{i18n.t('pm.pm_resource_page.k8')}</InputLabel>
          <Select
            value={selectedProject}
            label={i18n.t('pm.pm_resource_page.k9')}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <MenuItem value=''>
              <em>{i18n.t('pm.pm_resource_page.k10')}</em>
            </MenuItem>
            {projects.map((p: { id: string; name: string }) => (
              <MenuItem
                key={p.id}
                value={p.id}
              >
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {selectedProject ? (
        <CrudPage
          schema={resourceSchema}
          apiAdapter={apiAdapter}
          customRowActions={customRowActions}
          breadcrumbs={[
            { label: i18n.t('pm.pm_resource_page.k11'), href: '/dashboard' },
            { label: i18n.t('pm.pm_resource_page.k12') },
            { label: i18n.t('pm.pm_resource_page.k13') },
          ]}
          headerContent={headerContent}
        />
      ) : (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            color: 'text.secondary',
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Typography variant='body1'>{i18n.t('pm.pm_resource_page.k14')}</Typography>
        </Box>
      )}
    </Box>
  );
};
export default PmResourcePage;
