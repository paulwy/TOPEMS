/**
 * PmProjectDetailPage gantt Tab
 * @done V79 Phase 2 split
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, Typography } from '@mui/material';
import GanttChart from '@/components/pm/GanttChart';
import type { GanttPhase, GanttMilestone } from '@/api/pm';

export interface PmProjectGanttProps {
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
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader sx={{ pb: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontSize: '1.125rem' }}
        >
          {t('pm.projectdetail.project_gantt')}
        </Typography>
      </CardHeader>
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
