/**
 * PmProjectDetailPage phase (task) list Tab
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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import type { ProjectPhase } from '@/api/pm';
import { ActionButton, StatusBadge } from '@/components/common';

export interface PmProjectTaskListProps {
  phases: ProjectPhase[];
  formatDate: (dateStr?: string) => string;
}

const PmProjectTaskList: React.FC<PmProjectTaskListProps> = ({ phases, formatDate }) => {
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
            {t('pm.project_detail.phase_list')}
          </Typography>
        }
        action={
          <ActionButton
            label={t('pm.project_detail.add_phase')}
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
                <TableCell sx={{ width: 200 }}>{t('pm.project_detail.phase_name')}</TableCell>
                <TableCell>{t('pm.project_detail.status')}</TableCell>
                <TableCell sx={{ width: 180 }}>{t('pm.project_detail.progress')}</TableCell>
                <TableCell sx={{ width: 150 }}>{t('pm.project_detail.time')}</TableCell>
                <TableCell sx={{ width: 120 }}>{t('pm.project_detail.action')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {phases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ textAlign: 'center', py: 6, color: 'grey.500' }}
                  >
                    {t('pm.project_detail.no_phase_data')}
                  </TableCell>
                </TableRow>
              ) : (
                phases.map((phase: ProjectPhase) => (
                  <TableRow
                    key={phase.id}
                    sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                          {phase.name}
                        </Typography>
                        {phase.description && (
                          <Typography
                            variant='body2'
                            sx={{
                              color: 'grey.500',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {phase.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={phase.status}
                        label={
                          phase.status === 'completed'
                            ? t('pm.project_detail.completed')
                            : phase.status === 'active'
                              ? t('pm.project_detail.in_progress')
                              : t('pm.project_detail.not_started')
                        }
                        color={
                          phase.status === 'completed'
                            ? 'success'
                            : phase.status === 'active'
                              ? 'primary'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 96 }}>
                          <LinearProgress
                            value={phase.progress}
                            sx={{ height: 8 }}
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.600' }}
                        >
                          {phase.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                      <Box>
                        <Typography variant='body2'>{formatDate(phase.start_date)}</Typography>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.400', fontSize: '0.75rem' }}
                        >
                          {t('pm.project_detail.to')} {formatDate(phase.end_date)}
                        </Typography>
                      </Box>
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

export default PmProjectTaskList;
