/**
 * PmProjectDetailPage gantt Tab
 * @done V79 Phase 2 split
 */
import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@mui/material';
import GanttChart from '@/components/pm/GanttChart';
import type { GanttPhase, GanttMilestone } from '@/api/pm';
import i18n from '@/i18n';

interface PmProjectGanttProps {
  projectStartDate?: string;
  projectEndDate?: string;
  ganttPhases: GanttPhase[];
  ganttMilestones: GanttMilestone[];
  hasProject: boolean;
}
const PmProjectGantt: React.FC<PmProjectGanttProps> = ({
  projectStartDate,
  projectEndDate,
  ganttPhases,
  ganttMilestones,
  hasProject,
}) => {
  return (
    <Card>
      <CardHeader
        sx={{ pb: 2 }}
        title={
          <Typography
            variant='h6'
            sx={{ fontSize: '1.125rem' }}
          >
            {i18n.t('pm.projectdetail.project_gantt')}
          </Typography>
        }
      />
      <CardContent>
        {hasProject ? (
          <GanttChart
            phases={ganttPhases}
            milestones={ganttMilestones}
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};
export default PmProjectGantt;
