import React from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './ProjectTimelinePage.module.css';
import {
  TimelinePageTemplate,
  type TimelineGroup,
} from '../../components/templates/TimelinePageTemplate';
import { milestoneApi } from '@/api/pm/project';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { Plus, Rocket } from 'lucide-react';

const today = new Date();

interface TimelineRow {
  id: string;
  project_id: string;
  project_name?: string | null;
  project_code?: string | null;
  name: string;
  description?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  status: string;
  phase_id?: string | null;
}

const toStatus = (s: string): 'completed' | 'in-progress' | 'pending' | 'cancelled' => {
  switch (s) {
    case 'completed':
      return 'completed';
    case 'in_progress':
    case 'in-progress':
      return 'in-progress';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const toGroups = (rows: TimelineRow[]): TimelineGroup[] =>
  rows.length
    ? [
        {
          id: 'milestones',
          title: i18n.t('pm.project_timeline_page.k0'),
          icon: <Rocket className={styles.il1} />,
          color: 'secondary.500',
          collapsible: true,
          nodes: rows.map((r) => ({
            id: r.id,
            title: r.name,
            description: r.project_name
              ? [r.project_name, r.project_code].filter(Boolean).join(' · ')
              : (r.description ?? undefined),
            date: (r.due_date ?? r.completed_date ?? '').slice(0, 10) || '-',
            type: 'milestone',
            status: toStatus(r.status),
            priority: 'medium',
          })),
        },
      ]
    : [];

export const ProjectTimelinePage: React.FC = () => {
  const { data: groups = [] } = useQuery<TimelineGroup[]>({
    queryKey: ['pm-milestone-timeline'],
    queryFn: async () => {
      const res = await milestoneApi.getTimeline();
      return toGroups((res.data as { data?: TimelineRow[] }).data ?? []);
    },
  });
  return (
    <PageContainer
      autoTitle={false}
      autoBreadcrumbs={false}
      padding={false}
    >
      <TimelinePageTemplate
        title={i18n.t('pm.project_timeline_page.k36')}
        subtitle={i18n.t('pm.project_timeline_page.k37')}
        nodes={[]}
        groups={groups}
        showSearch
        showFilter
        showTimeRange
        timeRanges={[
          { id: 'today', label: i18n.t('pm.project_timeline_page.k38'), start: today, end: today },
          {
            id: 'week',
            label: i18n.t('pm.project_timeline_page.k39'),
            start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: today,
          },
          {
            id: 'month',
            label: i18n.t('pm.project_timeline_page.k40'),
            start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'all',
            label: i18n.t('pm.project_timeline_page.k41'),
            start: new Date(0),
            end: new Date(),
          },
        ]}
        selectedTimeRange='month'
        actions={[
          {
            label: i18n.t('pm.project_timeline_page.k42'),
            icon: <Plus className={styles.il4} />,
            onClick: () => {},
          },
        ]}
      />
    </PageContainer>
  );
};
export default ProjectTimelinePage;
