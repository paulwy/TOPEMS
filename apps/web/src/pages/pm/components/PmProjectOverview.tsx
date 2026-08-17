/**
 * PmProjectDetailPage overview Tab (basic info + key indicators)
 * @done V79 Phase 2 split
 */
import React from 'react';
import { Box, Typography, Card, CardContent, CardHeader, LinearProgress } from '@mui/material';
import type { Project, ProjectPhase, ProjectMilestone } from '@/api/pm';
import { StatusBadge } from '@/components/common';
import { getRiskLabels } from './pmProjectDetail.constants';
import i18n from '@/i18n';

export interface PmProjectOverviewProps {
  project: Project | null;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  completedPhases: number;
  completedMilestones: number;
  formatDate: (dateStr?: string) => string;
}
const PmProjectOverview: React.FC<PmProjectOverviewProps> = ({
  project,
  phases,
  milestones,
  completedPhases,
  completedMilestones,
  formatDate,
}) => {
  if (!project) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        gap: 3,
      }}
    >
      <Card>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.project_detail.basic_info')}
            </Typography>
          }
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.project_detail.project_code')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{project.code}</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.project_detail.project_type')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {project.project_type}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.project_detail.project_leader')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {project.leader || '-'}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.project_detail.start_date')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {formatDate(project.start_date)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.project_detail.end_date')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {formatDate(project.end_date)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <Typography sx={{ color: 'grey.500' }}>
              {i18n.t('pm.project_detail.risk_level')}
            </Typography>
            <StatusBadge
              status={project.risklevel || 'low'}
              label={
                getRiskLabels(i18n.t)[project.risklevel || ''] ||
                i18n.t('pm.project_detail.not_evaluated')
              }
              color={
                project.risklevel === 'high'
                  ? 'error'
                  : project.risklevel === 'medium'
                    ? 'warning'
                    : 'success'
              }
            />
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              {i18n.t('pm.project_detail.key_indicators')}
            </Typography>
          }
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {i18n.t('pm.project_detail.overall_progress')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {project.progress}%
              </Typography>
            </Box>
            <LinearProgress
              value={project.progress}
              sx={{ height: 12 }}
            />
          </Box>
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {i18n.t('pm.project_detail.phase_progress')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0}%
              </Typography>
            </Box>
            <LinearProgress
              value={phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0}
              sx={{ height: 12 }}
            />
          </Box>
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {i18n.t('pm.project_detail.milestone_completion')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {milestones.length > 0
                  ? Math.round((completedMilestones / milestones.length) * 100)
                  : 0}
                %
              </Typography>
            </Box>
            <LinearProgress
              value={
                milestones.length > 0
                  ? Math.round((completedMilestones / milestones.length) * 100)
                  : 0
              }
              sx={{ height: 12 }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default PmProjectOverview;
