/**
 * PmProjectDetailPage milestone Tab
 * @done V79 Phase 2 split
 */
import React from 'react';
import { Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import type { ProjectPhase, ProjectMilestone } from '@/api/pm';
import { ActionButton, StatusBadge } from '@/components/common';

export interface PmProjectMilestoneProps {
  milestones: ProjectMilestone[];
  phases: ProjectPhase[];
  formatDate: (dateStr?: string) => string;
}

const PmProjectMilestone: React.FC<PmProjectMilestoneProps> = ({
  milestones,
  phases,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader
        sx={{
          pb: 2,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        title={
          <Typography
            variant='h6'
            sx={{ fontSize: '1.125rem' }}
          >
            {t('pm.project_detail.milestone_list')}
          </Typography>
        }
        action={
          <ActionButton
            label={t('pm.project_detail.add_milestone')}
            variant='secondary'
            size='small'
          />
        }
      />
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 200 }}>{t('pm.project_detail.milestone_name')}</TableCell>
                <TableCell sx={{ width: 150 }}>{t('pm.project_detail.target_date')}</TableCell>
                <TableCell>{t('pm.project_detail.status')}</TableCell>
                <TableCell>{t('pm.project_detail.belongs_to_phase')}</TableCell>
                <TableCell sx={{ width: 120 }}>{t('pm.project_detail.action')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {milestones.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ textAlign: 'center', py: 6, color: 'grey.500' }}
                  >
                    {t('pm.project_detail.no_milestone_data')}
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map((milestone: ProjectMilestone) => (
                  <TableRow
                    key={milestone.id}
                    sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                          {milestone.name}
                        </Typography>
                        {milestone.description && (
                          <Typography
                            variant='body2'
                            sx={{
                              color: 'grey.500',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {milestone.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                      {formatDate(milestone.date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={milestone.status}
                        label={
                          milestone.status === 'completed'
                            ? t('pm.project_detail.completed')
                            : milestone.status === 'active'
                              ? t('pm.project_detail.in_progress')
                              : t('pm.project_detail.not_started')
                        }
                        color={
                          milestone.status === 'completed'
                            ? 'success'
                            : milestone.status === 'active'
                              ? 'primary'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                      {milestone.phase_id
                        ? phases.find((p: ProjectPhase) => p.id === milestone.phase_id)?.name || '-'
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <ActionButton
                        label={t('pm.project_detail.edit')}
                        icon={<Edit size={16} />}
                        variant='text'
                        size='small'
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PmProjectMilestone;
