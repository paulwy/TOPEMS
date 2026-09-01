import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import type { GanttMilestone, GanttPhase, Project, ProjectMilestone, ProjectPhase } from '@/api/pm';
import { buildPmProjectDetailHeader } from '../PmProjectDetailHeader';
import PmProjectFinance from '../PmProjectFinance';
import PmProjectGantt from '../PmProjectGantt';
import PmProjectMilestone from '../PmProjectMilestone';
import PmProjectOverview from '../PmProjectOverview';
import PmProjectTaskList from '../PmProjectTaskList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/common', () => ({
  ActionButton: ({ label }: { label: string }) => <button type='button'>{label}</button>,
  StatusBadge: ({ label, status }: { label: string; status: string }) => (
    <span data-status={status}>{label}</span>
  ),
}));

vi.mock('@/components/pm/GanttChart', () => ({
  default: ({
    phases,
    milestones,
    projectStartDate,
    projectEndDate,
  }: {
    phases: GanttPhase[];
    milestones: GanttMilestone[];
    projectStartDate?: string;
    projectEndDate?: string;
  }) => (
    <div data-testid='gantt-chart'>
      <span>{projectStartDate}</span>
      <span>{projectEndDate}</span>
      <span>phases:{phases.length}</span>
      <span>milestones:{milestones.length}</span>
    </div>
  ),
}));

const t = (key: string) => key;
const formatDate = (dateStr?: string) => (dateStr ? `日期:${dateStr}` : '-');
const formatCurrency = (amount?: number) => `¥${(amount ?? 0).toLocaleString()}`;

const project: Project = {
  id: 'project-1',
  name: '智慧工厂建设项目',
  code: 'PM-2026-001',
  description: '建设一体化智慧工厂平台',
  project_type: 'implementation',
  status: 'active',
  leader: '张三',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  budget: 1000000,
  progress: 60,
  risklevel: 'medium',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  cost_center_id: 'CC-001',
  cost_center_name: '项目成本中心',
  actual_cost: 420000,
  committed_cost: 120000,
  remaining_budget: 460000,
  cost_variance: 80000,
  revenue_recognized: 680000,
  accounts_receivable: 180000,
  gross_profit: 260000,
  gross_margin: 38.2,
  budget_utilization_rate: 54.5,
};

const phases: ProjectPhase[] = [
  {
    id: 'phase-1',
    project_id: 'project-1',
    name: '需求调研',
    description: '完成业务访谈和范围确认',
    sequence_number: 1,
    start_date: '2026-01-01',
    end_date: '2026-02-01',
    progress: 100,
    status: 'completed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'phase-2',
    project_id: 'project-1',
    name: '系统实施',
    description: '核心系统上线实施',
    sequence_number: 2,
    start_date: '2026-02-02',
    end_date: '2026-08-31',
    progress: 55,
    status: 'active',
    created_at: '2026-02-02T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const milestones: ProjectMilestone[] = [
  {
    id: 'milestone-1',
    project_id: 'project-1',
    name: '蓝图评审',
    description: '完成蓝图方案评审',
    date: '2026-03-15',
    status: 'completed',
    phase_id: 'phase-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'milestone-2',
    project_id: 'project-1',
    name: '试运行',
    description: '完成系统试运行',
    date: '2026-09-01',
    status: 'active',
    phase_id: 'phase-2',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
];

const ganttPhases: GanttPhase[] = [
  {
    id: 'phase-1',
    name: '需求调研',
    project_id: 'project-1',
    start_date: '2026-01-01',
    end_date: '2026-02-01',
    progress: 100,
    status: 'completed',
    predecessor_ids: [],
  },
];

const ganttMilestones: GanttMilestone[] = [
  {
    id: 'milestone-1',
    name: '蓝图评审',
    project_id: 'project-1',
    date: '2026-03-15',
    status: 'completed',
  },
];

describe('PmProjectDetail 组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('构建项目详情头部信息卡', () => {
    const infoCard = buildPmProjectDetailHeader({
      project,
      phases,
      milestones,
      completedPhases: 1,
      completedMilestones: 1,
      formatCurrency,
      t,
    });

    expect(infoCard).toEqual({
      title: '智慧工厂建设项目',
      subtitle: 'PM-2026-001',
      tags: ['进行中', '中'],
      stats: [
        { label: '项目进度', value: '60%' },
        { label: '阶段完成率', value: '1/2' },
        { label: '项目预算', value: '¥1,000,000' },
        { label: '里程碑', value: '1/2' },
      ],
    });
  });
});
