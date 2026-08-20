/**
 * MobileQuality task list component
 * @refactor-split Extracted from MobileQualityPage.tsx
 */
import React from 'react';
import { Box, Typography, Paper, Chip, List, Divider } from '@mui/material';
import { CheckCircle, XCircle, Clock, ClipboardCheck } from 'lucide-react';
import { useNotificationStore } from '@/store';
import { MobileButton } from '@/components/mobile';
import type { QualityTask } from '@/api/mobile';
import type { TaskAction, ChipColor } from '../hooks/useMobileQuality';
import i18n from '@/i18n';

interface MobileQualityTaskListProps {
  filteredTasks: QualityTask[];
  getTypeLabel: (type: string) => string;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => ChipColor;
  onTaskAction: (task: QualityTask, action: TaskAction) => void;
  onReportDefect: (task: QualityTask) => void;
}
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircle style={{ width: 20, height: 20 }} />;
    case 'failed':
      return <XCircle style={{ width: 20, height: 20 }} />;
    case 'pending':
      return <Clock style={{ width: 20, height: 20 }} />;
    default:
      return <ClipboardCheck style={{ width: 20, height: 20 }} />;
  }
};
const MobileQualityTaskList: React.FC<MobileQualityTaskListProps> = ({
  filteredTasks,
  getTypeLabel,
  getStatusLabel,
  getStatusColor,
  onTaskAction,
  onReportDefect,
}) => {
  const { addNotification } = useNotificationStore();
  return (
    <List disablePadding>
      {filteredTasks.map((task, index) => (
        <React.Fragment key={task.id}>
          <Paper
            elevation={0}
            sx={{
              mx: 2,
              my: 1,
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={getTypeLabel(task.type)}
                  size='small'
                  color='primary'
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                <Chip
                  label={getStatusLabel(task.status)}
                  size='small'
                  color={getStatusColor(task.status) as React.ComponentProps<typeof Chip>['color']}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {task.task_no}
              </Typography>
            </Box>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {task.product_name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  {i18n.t('mobile.quality.label.batch_no')}
                </Typography>
                <Typography variant='body2'>{task.batch_no}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  {i18n.t('mobile.quality.label.quantity')}
                </Typography>
                <Typography variant='body2'>{task.quantity.toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  {i18n.t('mobile.quality.label.inspector')}
                </Typography>
                <Typography variant='body2'>{task.inspector}</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1.5,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('mobile.quality.label.due_date_value', { date: task.due_date })}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {task.status === 'pending' && (
                  <MobileButton
                    size='small'
                    variant='contained'
                    onClick={() => onTaskAction(task, 'start')}
                  >
                    {i18n.t('mobile.quality.action.start_inspection')}
                  </MobileButton>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <MobileButton
                      size='small'
                      variant='outlined'
                      color='error'
                      onClick={() => onReportDefect(task)}
                    >
                      {i18n.t('mobile.quality.action.report_defect')}
                    </MobileButton>
                    <MobileButton
                      size='small'
                      variant='contained'
                      color='success'
                      onClick={() => onTaskAction(task, 'pass')}
                    >
                      {i18n.t('mobile.quality.action.pass')}
                    </MobileButton>
                  </>
                )}
                {(task.status === 'passed' || task.status === 'failed') && (
                  <MobileButton
                    size='small'
                    variant='outlined'
                    onClick={() =>
                      addNotification({
                        title: i18n.t('mobile.quality.action.view_report'),
                        message: i18n.t('mobile.quality.action.view_inspection_detail'),
                        type: 'info',
                      })
                    }
                  >
                    {i18n.t('mobile.quality.action.view_report')}
                  </MobileButton>
                )}
              </Box>
            </Box>
          </Paper>
          {index < filteredTasks.length - 1 && <Divider sx={{ mx: 2 }} />}
        </React.Fragment>
      ))}
    </List>
  );
};
