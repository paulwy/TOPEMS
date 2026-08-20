/**
 * PmProjectDetailPage project info header (infoCard builder)
 * @done V79 Phase 2 split
 */
import type { Project, ProjectPhase, ProjectMilestone } from '@/api/pm';
import { getStatusLabels, getRiskLabels } from './pmProjectDetail.constants';
import i18n from '@/i18n';

export interface PmProjectDetailHeaderProps {
  project: Project | null;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  completedPhases: number;
  completedMilestones: number;
  formatCurrency: (amount?: number) => string;
  t: (key: string) => string;
}
export interface PmProjectDetailInfoCard {
  title: string;
  subtitle: string;
  tags: string[];
  stats: Array<{ label: string; value: string }>;
}
/**
 * Build DetailPageTemplate infoCard data (project name/status/progress/leader etc.)
 * Pure function: receives `t` from the caller to avoid module-level i18n.t() calls.
 */
const buildPmProjectDetailHeader = ({
  project,
  phases,
  milestones,
  completedPhases,
  completedMilestones,
  formatCurrency,
  t,
}: PmProjectDetailHeaderProps): PmProjectDetailInfoCard | undefined => {
  if (!project) return undefined;
  const statusKey = project.status || 'draft';
  const statusLabels = getStatusLabels(i18n.t);
  const riskLabels = getRiskLabels(i18n.t);
  return {
    title: project.name,
    subtitle: project.code,
    tags: [
      statusLabels[statusKey],
      riskLabels[project.risklevel || ''] || ` + ${i18n.t('pm.project_detail.not_evaluated')} + `,
    ],
    stats: [
      {
        label: i18n.t('pm.project_detail.project_progress'),
        value: `${project.progress}%`,
      },
      {
        label: i18n.t('pm.project_detail.phase_completion'),
        value: `${completedPhases}/${phases.length}`,
      },
      {
        label: i18n.t('pm.project_detail.project_budget'),
        value: formatCurrency(project.budget),
      },
      {
        label: i18n.t('pm.project_detail.milestone'),
        value: `${completedMilestones}/${milestones.length}`,
      },
    ],
  };
};
