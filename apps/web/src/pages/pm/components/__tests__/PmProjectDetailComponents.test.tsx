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
      tags: ['pm.project_detail.status.active', 'pm.project_detail.risk.medium'],
      stats: [
        { label: 'pm.project_detail.project_progress', value: '60%' },
        { label: 'pm.project_detail.phase_completion', value: '1/2' },
        { label: 'pm.project_detail.project_budget', value: '¥1,000,000' },
        { label: 'pm.project_detail.milestone', value: '1/2' },
      ],
    });
  });

  it('项目为空时头部信息卡返回 undefined', () => {
    const infoCard = buildPmProjectDetailHeader({
      project: null,
      phases: [],
      milestones: [],
      completedPhases: 0,
      completedMilestones: 0,
      formatCurrency,
      t,
    });

    expect(infoCard).toBeUndefined();
  });

  it('概览页渲染基本信息和关键指标', () => {
    renderWithProviders(
      <PmProjectOverview
        project={project}
        phases={phases}
        milestones={milestones}
        completedPhases={1}
        completedMilestones={1}
        formatDate={formatDate}
      />
    );

    expect(screen.getByText('pm.project_detail.basic_info')).toBeInTheDocument();
    expect(screen.getByText('pm.project_detail.key_indicators')).toBeInTheDocument();
    expect(screen.getByText('PM-2026-001')).toBeInTheDocument();
    expect(screen.getByText('implementation')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('日期:2026-01-01')).toBeInTheDocument();
    expect(screen.getByText('pm.project_detail.risk.medium')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });

  it('概览页项目为空时不渲染内容', () => {
    const { container } = renderWithProviders(
      <PmProjectOverview
        project={null}
        phases={[]}
        milestones={[]}
        completedPhases={0}
        completedMilestones={0}
        formatDate={formatDate}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('阶段列表渲染阶段数据和空态', () => {
    const { rerender } = renderWithProviders(
      <PmProjectTaskList
        phases={phases}
        formatDate={formatDate}
      />
    );

    expect(screen.getByText('pm.project_detail.phase_list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pm.project_detail.add_phase' })).toBeInTheDocument();
    expect(screen.getByText('需求调研')).toBeInTheDocument();
    expect(screen.getByText('完成业务访谈和范围确认')).toBeInTheDocument();
    expect(screen.getByText('系统实施')).toBeInTheDocument();
    expect(screen.getByText('pm.project_detail.completed')).toBeInTheDocument();
    expect(screen.getByText('pm.project_detail.in_progress')).toBeInTheDocument();
    expect(screen.getByText('日期:2026-01-01')).toBeInTheDocument();

    rerender(
      <PmProjectTaskList
        phases={[]}
        formatDate={formatDate}
      />
    );
    expect(screen.getByText('pm.project_detail.no_phase_data')).toBeInTheDocument();
  });

  it('里程碑列表渲染阶段归属和空态', () => {
    const { rerender } = renderWithProviders(
      <PmProjectMilestone
        milestones={milestones}
        phases={phases}
        formatDate={formatDate}
      />
    );

    expect(screen.getByText('pm.project_detail.milestone_list')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'pm.project_detail.add_milestone' })
    ).toBeInTheDocument();
    expect(screen.getByText('蓝图评审')).toBeInTheDocument();
    expect(screen.getByText('完成蓝图方案评审')).toBeInTheDocument();
    expect(screen.getByText('试运行')).toBeInTheDocument();
    expect(screen.getByText('需求调研')).toBeInTheDocument();
    expect(screen.getByText('系统实施')).toBeInTheDocument();
    expect(screen.getByText('日期:2026-03-15')).toBeInTheDocument();

    rerender(
      <PmProjectMilestone
        milestones={[]}
        phases={phases}
        formatDate={formatDate}
      />
    );
    expect(screen.getByText('pm.project_detail.no_milestone_data')).toBeInTheDocument();
  });

  it('财务页渲染预算、利润、成本中心和快捷操作', () => {
    renderWithProviders(
      <PmProjectFinance
        project={project}
        formatCurrency={formatCurrency}
      />
    );

    expect(screen.getByText('pm.projectdetail.budget_execution')).toBeInTheDocument();
    expect(screen.getByText('pm.projectdetail.revenue_and_profit')).toBeInTheDocument();
    expect(screen.getByText('pm.projectdetail.cost_composition')).toBeInTheDocument();
    expect(screen.getByText('pm.projectdetail.cost_center_info')).toBeInTheDocument();
    expect(screen.getByText('pm.projectdetail.quick_actions')).toBeInTheDocument();
    expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
    expect(screen.getByText('¥420,000')).toBeInTheDocument();
    expect(screen.getByText('¥460,000')).toBeInTheDocument();
    expect(screen.getByText('¥680,000')).toBeInTheDocument();
    expect(screen.getByText('¥260,000')).toBeInTheDocument();
    expect(screen.getByText('38.2%')).toBeInTheDocument();
    expect(screen.getByText('CC-001')).toBeInTheDocument();
    expect(screen.getByText('项目成本中心')).toBeInTheDocument();
    expect(screen.getByText('pm.projectdetail.normal')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'pm.projectdetail.view_detail' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'pm.projectdetail.generate_project_voucher' })
    ).toBeInTheDocument();
  });

  it('财务页项目为空时不渲染内容', () => {
    const { container } = renderWithProviders(
      <PmProjectFinance
        project={null}
        formatCurrency={formatCurrency}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('甘特页有项目时渲染 GanttChart，项目为空时只保留标题', () => {
    const { rerender } = renderWithProviders(
      <PmProjectGantt
        projectStartDate='2026-01-01'
        projectEndDate='2026-12-31'
        ganttPhases={ganttPhases}
        ganttMilestones={ganttMilestones}
        hasProject
      />
    );

    expect(screen.getByText('pm.projectdetail.project_gantt')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByText('phases:1')).toBeInTheDocument();
    expect(screen.getByText('milestones:1')).toBeInTheDocument();

    rerender(
      <PmProjectGantt
        ganttPhases={[]}
        ganttMilestones={[]}
        hasProject={false}
      />
    );
    expect(screen.getByText('pm.projectdetail.project_gantt')).toBeInTheDocument();
    expect(screen.queryByTestId('gantt-chart')).not.toBeInTheDocument();
  });
});
