import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TimelinePageTemplate,
  type TimelineGroup,
} from '../../components/templates/TimelinePageTemplate';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { Plus, Rocket, Target, Calendar } from 'lucide-react';
import { pmApi } from '@/api/pm';
const today = new Date();
const formatDate = (daysOffset: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};
const groups: TimelineGroup[] = [
  {
    id: 'milestones',
    title: i18n.t('pm.project_timeline_page.k0'),
    icon: <Rocket style={{ width: 18, height: 18 }} />,
    color: 'secondary.500',
    collapsible: true,
    nodes: [
      {
        id: 'm1',
        title: i18n.t('pm.project_timeline_page.k1'),
        description: i18n.t('pm.project_timeline_page.k2'),
        date: formatDate(-10),
        type: 'milestone',
        status: 'completed',
        priority: 'high',
        participants: [
          { id: '1', name: i18n.t('pm.project_timeline_page.k3') },
          { id: '2', name: i18n.t('pm.project_timeline_page.k4') },
        ],
      },
      {
        id: 'm2',
        title: i18n.t('pm.project_timeline_page.k5'),
        description: i18n.t('pm.project_timeline_page.k6'),
        date: formatDate(-5),
        type: 'milestone',
        status: 'completed',
        priority: 'high',
        participants: [{ id: '3', name: i18n.t('pm.project_timeline_page.k7') }],
      },
      {
        id: 'm3',
        title: i18n.t('pm.project_timeline_page.k8'),
        description: i18n.t('pages.project_timeline_page.ui_0'),
        date: formatDate(5),
        type: 'milestone',
        status: 'in-progress',
        priority: 'medium',
      },
      {
        id: 'm4',
        title: i18n.t('pm.project_timeline_page.k9'),
        description: i18n.t('pm.project_timeline_page.k10'),
        date: formatDate(20),
        type: 'milestone',
        status: 'pending',
        priority: 'high',
      },
      {
        id: 'm5',
        title: i18n.t('pm.project_timeline_page.k11'),
        description: i18n.t('pm.project_timeline_page.k12'),
        date: formatDate(35),
        type: 'milestone',
        status: 'pending',
        priority: 'high',
      },
    ],
  },
  {
    id: 'tasks',
    title: i18n.t('pm.project_timeline_page.k13'),
    icon: <Target style={{ width: 18, height: 18 }} />,
    color: 'primary.500',
    collapsible: true,
    nodes: [
      {
        id: 't1',
        title: i18n.t('pm.project_timeline_page.k14'),
        description: i18n.t('pm.project_timeline_page.k15'),
        date: formatDate(-3),
        time: '09:00',
        type: 'task',
        status: 'completed',
        priority: 'high',
        tags: [{ label: i18n.t('pm.project_timeline_page.k16'), color: 'success.500' }],
      },
      {
        id: 't2',
        title: i18n.t('pages.project_timeline_page.api_1'),
        description: i18n.t('pm.project_timeline_page.restfulapi_17'),
        date: formatDate(2),
        time: '14:00',
        type: 'task',
        status: 'in-progress',
        priority: 'high',
        tags: [{ label: i18n.t('pm.project_timeline_page.k18'), color: 'success.500' }],
        children: [
          {
            id: 't2-1',
            title: i18n.t('pm.project_timeline_page.api_19'),
            date: formatDate(0),
            type: 'task',
            status: 'completed',
          },
          {
            id: 't2-2',
            title: i18n.t('pm.project_timeline_page.api_20'),
            date: formatDate(3),
            type: 'task',
            status: 'in-progress',
          },
          {
            id: 't2-3',
            title: i18n.t('pm.project_timeline_page.api_21'),
            date: formatDate(8),
            type: 'task',
            status: 'pending',
          },
        ],
      },
      {
        id: 't3',
        title: i18n.t('pm.project_timeline_page.k22'),
        description: i18n.t('pm.project_timeline_page.k23'),
        date: formatDate(10),
        type: 'task',
        status: 'pending',
        priority: 'medium',
        tags: [{ label: i18n.t('pm.project_timeline_page.k24'), color: 'cyan.500' }],
      },
    ],
  },
  {
    id: 'meetings',
    title: i18n.t('pm.project_timeline_page.k25'),
    icon: <Calendar style={{ width: 18, height: 18 }} />,
    color: 'warning.500',
    collapsible: true,
    nodes: [
      {
        id: 'mt1',
        title: i18n.t('pm.project_timeline_page.k26'),
        description: i18n.t('pm.project_timeline_page.k27'),
        date: formatDate(0),
        time: '10:00',
        type: 'meeting',
        location: i18n.t('pm.project_timeline_page.a_28'),
        participants: [
          { id: '1', name: i18n.t('pm.project_timeline_page.k29') },
          { id: '2', name: i18n.t('pm.project_timeline_page.k30') },
          { id: '3', name: i18n.t('pm.project_timeline_page.k31') },
          { id: '4', name: i18n.t('pm.project_timeline_page.k32') },
        ],
      },
      {
        id: 'mt2',
        title: i18n.t('pm.project_timeline_page.k33'),
        description: i18n.t('pm.project_timeline_page.k34'),
        date: formatDate(8),
        time: '14:00',
        type: 'meeting',
        location: i18n.t('pm.project_timeline_page.b_35'),
      },
    ],
  },
];
export const ProjectTimelinePage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['pm-timeline'],
    queryFn: async () => {
      try {
        return await pmApi.milestones.getTimeline();
      } catch {
        return {};
      }
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
          { id: 'all', label: i18n.t('pm.project_timeline_page.k41'), start: new Date(0), end: new Date() },
        ]}
        selectedTimeRange='month'
        actions={[
          {
            label: i18n.t('pm.project_timeline_page.k42'),
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => {},
          },
        ]}
      />
    </PageContainer>
  );
};
export default ProjectTimelinePage;