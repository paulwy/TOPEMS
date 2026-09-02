/**
 * PmProjectDetailPage state + API calls hook
 * @done V79 Phase 2 split
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pmApi } from '@/api/pm';
import type { Project, ProjectPhase, ProjectMilestone, GanttPhase, GanttMilestone } from '@/api/pm';

import { QUERY_KEYS } from '@/lib/reactQuery';

interface UsePmProjectDetailReturn {
  id: string | undefined;
  project: Project | null;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  loading: boolean;
  error: unknown;
  ganttPhases: GanttPhase[];
  ganttMilestones: GanttMilestone[];
  completedPhases: number;
  completedMilestones: number;
  formatDate: (dateStr?: string) => string;
  formatCurrency: (amount?: number) => string;
  handleRefresh: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

const formatCurrency = (amount?: number) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const usePmProjectDetail = (): UsePmProjectDetailReturn => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECT(id || ''),
    queryFn: () => pmApi.projects.get(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const phasesQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'phases'],
    queryFn: () => pmApi.phases.list(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const milestonesQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'milestones'],
    queryFn: () => pmApi.milestones.list(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const project =
    projectQuery.data?.success && projectQuery.data.data ? projectQuery.data.data : null;
  const phases =
    phasesQuery.data?.success && phasesQuery.data.data
      ? (phasesQuery.data.data as unknown as { phases?: ProjectPhase[] }).phases ||
        phasesQuery.data.data ||
        []
      : [];
  const milestones =
    milestonesQuery.data?.success && milestonesQuery.data.data
      ? (milestonesQuery.data.data as unknown as { milestones?: ProjectMilestone[] }).milestones ||
        milestonesQuery.data.data ||
        []
      : [];
  const loading = projectQuery.isLoading || phasesQuery.isLoading || milestonesQuery.isLoading;
  const error = projectQuery.error || phasesQuery.error || milestonesQuery.error;

  const ganttPhases: GanttPhase[] = useMemo(
    () =>
      phases.map((p: ProjectPhase) => ({
        id: p.id,
        name: p.name,
        project_id: p.project_id,
        start_date: p.start_date,
        end_date: p.end_date,
        progress: p.progress,
        status: p.status,
        predecessor_ids: p.predecessor_ids || [],
      })),
    [phases]
  );

  const ganttMilestones: GanttMilestone[] = useMemo(
    () =>
      milestones.map((m: ProjectMilestone) => ({
        id: m.id,
        name: m.name,
        project_id: m.project_id,
        date: m.date,
        status: m.status,
      })),
    [milestones]
  );

  const completedPhases = useMemo(
    () => phases.filter((p: { status: string }) => p.status === 'completed').length,
    [phases]
  );
  const completedMilestones = useMemo(
    () => milestones.filter((m: { status: string }) => m.status === 'completed').length,
    [milestones]
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.PM.PROJECT(id || ''),
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'phases'],
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.PM.PROJECT(id || ''), 'milestones'],

      exact: false,
      refetchType: 'active',
    });
  };

  return {
    id,
    project,
    phases,
    milestones,
    loading,
    error,
    ganttPhases,
    ganttMilestones,
    completedPhases,
    completedMilestones,
    formatDate,
    formatCurrency,
    handleRefresh,
    navigate,
  };
};
