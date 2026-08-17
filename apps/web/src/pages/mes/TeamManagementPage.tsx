import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import i18n from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { LoadingSpinner } from '@topems/shared-components';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { PageContainer } from '@/components/common';
import { teamSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { Team, TeamMember, CreateTeamRequest, UpdateTeamRequest } from '@/api/mes/types';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;
const apiAdapter = createCrudPageAdapter<Team, CreateTeamRequest, UpdateTeamRequest>(
  {
    list: mesApi.teams.list,
    create: mesApi.teams.create,
    update: mesApi.teams.update,
    delete: mesApi.teams.delete,
  },
  { itemsField: 'teams' }
);
function TeamDetailContent({ row }: { row: Record<string, unknown> }) {
  const teamId = String(row.id);
  const { data: membersData, isPending } = useQuery({
    queryKey: [...QUERY_KEYS.MES.TEAMS, teamId, 'members'],
    queryFn: async () => {
      const response = await mesApi.teams.getMembers(teamId);
      if (response.success && response.data) {
        return response.data.members || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const members = (membersData as TeamMember[]) || [];
  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    active: {
      label: i18n.t('mes.team_management_page.k0'),
      bg: 'success.lighter',
      color: 'success.700',
    },
    inactive: {
      label: i18n.t('mes.team_management_page.k1'),
      bg: 'grey.100',
      color: 'text.secondary',
    },
  };
  const status = statusMap[String(row.status)] || statusMap.inactive;
  const typeMap: Record<string, string> = {
    production: i18n.t('mes.team_management_page.k2'),
    maintenance: i18n.t('mes.team_management_page.k3'),
    quality: i18n.t('mes.team_management_page.k4'),
    logistics: i18n.t('mes.team_management_page.k5'),
  };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k0')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {String(row.team_code || '-')}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k1')}
          </Typography>
          <Typography variant='body2'>{String(row.team_name || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k2')}
          </Typography>
          <Typography variant='body2'>
            {typeMap[String(row.team_type)] || String(row.team_type || '-')}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k3')}
          </Typography>
          <Typography variant='body2'>{String(row.work_station_name || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k4')}
          </Typography>
          <Typography variant='body2'>{String(row.leader_name || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k5')}
          </Typography>
          <Typography variant='body2'>{Number(row.member_count) || 0}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k6')}
          </Typography>
          <Chip
            size='small'
            label={status.label}
            sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 500 }}
          />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.team_management_page.k7')}
          </Typography>
          <Typography variant='body2'>{String(row.description || '-')}</Typography>
        </Box>
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {i18n.t('pages.team_management_page.k8')}
        </Typography>
        {isPending ? (
          <LoadingSpinner />
        ) : (
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('mes.team_management_page.k6')}</TableCell>
                  <TableCell>{i18n.t('mes.team_management_page.k7')}</TableCell>
                  <TableCell>{i18n.t('mes.team_management_page.k8')}</TableCell>
                  <TableCell>{i18n.t('mes.team_management_page.k9')}</TableCell>
                  <TableCell>{i18n.t('mes.team_management_page.k10')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                      sx={{ py: 3, color: 'text.secondary' }}
                    >
                      {i18n.t('pages.team_management_page.k9')}
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.employee_code || '-'}</TableCell>
                      <TableCell>{member.employee_name}</TableCell>
                      <TableCell>{member.position || '-'}</TableCell>
                      <TableCell>
                        {member.join_date
                          ? new Date(member.join_date).toLocaleDateString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={
                            member.status === 'active'
                              ? i18n.t('mes.team_management_page.k12')
                              : i18n.t('mes.team_management_page.k11')
                          }
                          sx={{
                            backgroundColor:
                              member.status === 'active' ? 'success.lighter' : 'grey.100',
                            color: member.status === 'active' ? 'success.700' : 'text.secondary',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
function TeamManagementPage() {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={teamSchema}
        apiAdapter={apiAdapter}
        detailContent={(row: Record<string, unknown>) => <TeamDetailContent row={row} />}
        detailMaxWidth='lg'
        headerContent={(rows, total) => {
          const active = rows.filter((r) => r.status === 'active').length;
          const inactive = rows.filter((r) => r.status === 'inactive').length;
          const totalMembers = rows.reduce((sum: number, r) => sum + (r.member_count || 0), 0);
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.team_management_page.k10')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {total}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.team_management_page.k11')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {active}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.team_management_page.k12')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {inactive}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.team_management_page.k13')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {totalMembers}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
    </PageContainer>
  );
}
export default TeamManagementPage;
