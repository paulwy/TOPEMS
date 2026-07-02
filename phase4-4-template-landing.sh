#!/usr/bin/env bash
# =============================================================================
# Phase 4.4 — Template Landing
# 将 4 个零使用的 Page Template 落地到实际业务示范页面:
#   1. KanbanPageTemplate    -> PmProjectKanbanPage
#   2. WizardPageTemplate   -> QmsApqpWizardPage
#   3. TimelinePageTemplate  -> HrmEmployeeTimelinePage
#   4. MasterDetailPageTemplate -> LimsMethodDetailMasterPage
# 并追加路由注册
# =============================================================================
set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
SRC_DIR="${PROJECT_ROOT}/apps/web/src"
BACKUP_SUFFIX=".bak.phase4-4"

# ---- 颜色输出 ----
info()  { echo -e "\033[32m[INFO]\033[0m  $*"; }
warn()  { echo -e "\033[33m[WARN]\033[0m  $*"; }
err()   { echo -e "\033[31m[ERROR]\033[0m $*"; exit 1; }

# ---- 幂等检查 ----
idempotent_check() {
  local file="$1"
  local marker="$2"
  if [[ -f "$file" ]] && grep -qF "$marker" "$file" 2>/dev/null; then
    warn "已存在标记 ${marker}，跳过: $(basename "$file")"
    return 1
  fi
  return 0
}

# ---- 备份 ----
backup() {
  local file="$1"
  if [[ -f "$file" && ! -f "${file}${BACKUP_SUFFIX}" ]]; then
    cp "$file" "${file}${BACKUP_SUFFIX}"
    info "已备份: $(basename "$file")"
  fi
}

# ---- 确保目录存在 ----
ensure_dir() {
  mkdir -p "$(dirname "$1")"
}

# =============================================================================
# 1. PmProjectKanbanPage — 使用 KanbanPageTemplate
# =============================================================================
create_pm_kanban_page() {
  local dest="${SRC_DIR}/pages/pm/PmProjectKanbanPage.tsx"
  idempotent_check "$dest" "KanbanPageTemplate 落地示范" || return 0
  ensure_dir "$dest"
  backup "$dest"

  cat > "$dest" << 'KANBAN_EOF'
/**
 * PM 项目管理看板 — 使用 KanbanPageTemplate 展示项目任务状态
 * KanbanPageTemplate 落地示范
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  KanbanPageTemplate,
  type KanbanCard,
  type KanbanColumn,
  type KanbanAction,
  type KanbanStats,
} from '@/components/templates/KanbanPageTemplate';
import { PageContainer } from '@/components/common';

const PmProjectKanbanPage: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');

  const allCards: KanbanCard[] = [
    {
      id: '1',
      title: '客户管理系统升级',
      description: 'CRM模块v2.0重构',
      priority: 'high',
      assignee: { id: 'u-01', name: '张明远' },
      tags: [{ label: 'CRM' }, { label: '重构' }],
      dueDate: '2026-07-15',
      comments: 5,
      attachments: 2,
      subtasks: { total: 8, completed: 3 },
    },
    {
      id: '2',
      title: '供应商评估流程',
      description: 'SRM年度评审',
      priority: 'medium',
      assignee: { id: 'u-02', name: '李芳' },
      tags: [{ label: 'SRM' }],
      dueDate: '2026-07-20',
      comments: 2,
      attachments: 1,
      subtasks: { total: 4, completed: 0 },
    },
    {
      id: '3',
      title: 'MES数据采集优化',
      description: 'OEE提升方案实施',
      priority: 'high',
      assignee: { id: 'u-03', name: '王强' },
      tags: [{ label: 'MES' }, { label: '优化' }],
      dueDate: '2026-06-28',
      comments: 8,
      attachments: 3,
      subtasks: { total: 6, completed: 6 },
    },
    {
      id: '4',
      title: '质量体系认证',
      description: 'ISO 9001年度审核',
      priority: 'medium',
      assignee: { id: 'u-04', name: '赵丽' },
      tags: [{ label: 'QMS' }],
      dueDate: '2026-08-01',
      comments: 1,
      attachments: 0,
      subtasks: { total: 5, completed: 2 },
    },
    {
      id: '5',
      title: 'WMS库位规划',
      description: '新仓库布局设计',
      priority: 'low',
      assignee: { id: 'u-05', name: '刘伟' },
      tags: [{ label: 'WMS' }],
      dueDate: '2026-07-10',
      comments: 0,
      attachments: 1,
      subtasks: { total: 3, completed: 1 },
    },
  ];

  // 按 status 分组构建 columns
  const columns: KanbanColumn[] = useMemo(() => {
    const todoCards = allCards.filter((_, i) => [1].includes(i));
    const inProgressCards = allCards.filter((_, i) => [0, 3].includes(i));
    const reviewCards = allCards.filter((_, i) => [4].includes(i));
    const doneCards = allCards.filter((_, i) => [2].includes(i));

    return [
      { id: 'todo', title: '待处理', status: 'todo', cards: todoCards, color: '#94A3B8', collapsible: true },
      { id: 'in-progress', title: '进行中', status: 'in-progress', cards: inProgressCards, color: '#3B82F6' },
      { id: 'review', title: '审核中', status: 'review', cards: reviewCards, color: '#F59E0B' },
      { id: 'done', title: '已完成', status: 'done', cards: doneCards, color: '#22C55E' },
    ];
  }, []);

  const stats: KanbanStats = useMemo(
    () => ({
      totalCards: allCards.length,
      totalColumns: columns.length,
      overdueCards: allCards.filter((c) => c.dueDate && new Date(c.dueDate) < new Date()).length,
      completedCards: columns.find((c) => c.status === 'done')?.cards.length ?? 0,
    }),
    [allCards, columns],
  );

  const handleCardMove = useCallback(
    (cardId: string, sourceColumn: string, targetColumn: string, targetIndex: number) => {
      // 实际项目中调用 pmApi 更新项目状态
      console.log('[Kanban] card moved:', { cardId, sourceColumn, targetColumn, targetIndex });
    },
    [],
  );

  const handleCardClick = useCallback((cardId: string) => {
    console.log('[Kanban] card clicked:', cardId);
  }, []);

  const actions: KanbanAction[] = [
    { label: '新建项目', onClick: () => console.log('New project') },
    { label: '筛选', onClick: () => console.log('Filter') },
  ];

  return (
    <KanbanPageTemplate
      title="项目看板"
      subtitle="可视化项目任务进度管理"
      columns={columns}
      stats={stats}
      onCardMove={handleCardMove}
      showStats
      showSearch
      showFilter
      searchValue={searchValue}
      onSearch={setSearchValue}
      actions={actions}
    />
  );
};

export default PmProjectKanbanPage;
KANBAN_EOF

  info "已创建: $(basename "$dest")"
}

# =============================================================================
# 2. QmsApqpWizardPage — 使用 WizardPageTemplate
# =============================================================================
create_qms_apqp_wizard_page() {
  local dest="${SRC_DIR}/pages/qms/QmsApqpWizardPage.tsx"
  idempotent_check "$dest" "WizardPageTemplate 落地示范" || return 0
  ensure_dir "$dest"
  backup "$dest"

  cat > "$dest" << 'WIZARD_EOF'
/**
 * QMS APQP 产品质量先期策划 — 使用 WizardPageTemplate 展示 5 阶段 APQP 流程
 * WizardPageTemplate 落地示范
 */
import React, { useState } from 'react';
import {
  WizardPageTemplate,
  type WizardStep,
  type WizardAction,
} from '@/components/templates/WizardPageTemplate';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';

const QmsApqpWizardPage: React.FC = () => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: WizardStep[] = [
    {
      id: 'plan',
      label: '计划和确定项目',
      description: '确定客户需求、产品要求和项目目标',
      optional: false,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            项目基本信息
          </Typography>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField label="客户名称" size="small" fullWidth />
              <TextField label="产品名称" size="small" fullWidth />
              <TextField label="项目编号" size="small" fullWidth />
              <TextField
                label="目标日期"
                size="small"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Paper>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2 }}>
            客户需求清单
          </Typography>
          <Alert severity="info">请填写客户提出的所有需求和期望</Alert>
        </Box>
      ),
    },
    {
      id: 'design',
      label: '产品设计和开发',
      description: '设计评审、可行性分析、材料规范',
      optional: false,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            设计评审记录
          </Typography>
          <LinearProgress value={40} variant="determinate" />
          <Typography variant="body2" color="text.secondary">
            完成度: 40%
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>评审项</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>负责人</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>材料规范确认</TableCell>
                  <TableCell>
                    <Chip label="通过" color="success" size="small" />
                  </TableCell>
                  <TableCell>张工</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>可靠性分析</TableCell>
                  <TableCell>
                    <Chip label="进行中" color="warning" size="small" />
                  </TableCell>
                  <TableCell>李工</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ),
    },
    {
      id: 'process',
      label: '过程设计和开发',
      description: '过程流程图、PFMEA、控制计划',
      optional: false,
      component: (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            请完成产品设计和开发阶段后进入此阶段
          </Typography>
          <Chip label="待开放" sx={{ mt: 1 }} />
        </Box>
      ),
    },
    {
      id: 'product',
      label: '产品和过程确认',
      description: 'MSA、SPC、PPAP 提交',
      optional: false,
      component: (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            此阶段内容将在前置阶段完成后开放
          </Typography>
        </Box>
      ),
    },
    {
      id: 'feedback',
      label: '反馈、评定和纠正措施',
      description: '持续改进、客户满意度、经验教训',
      optional: false,
      component: (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            此阶段内容将在前置阶段完成后开放
          </Typography>
        </Box>
      ),
    },
  ];

  const handleStepChange = (stepIndex: number, _stepId: string) => {
    console.log('[APQP] step changed to', stepIndex);
  };

  const handleComplete = (data: Record<string, any>) => {
    console.log('[APQP] completed with data:', data);
  };

  const customActions: WizardAction[] = [
    { label: '保存草稿', onClick: () => console.log('Save draft'), variant: 'outlined' },
    { label: '导出报告', onClick: () => console.log('Export'), variant: 'outlined' },
  ];

  return (
    <WizardPageTemplate
      title="APQP 产品质量先期策划"
      subtitle="5 阶段产品质量策划向导"
      steps={steps}
      onStepChange={handleStepChange}
      onComplete={handleComplete}
      customActions={customActions}
      showProgress
      showNavigation
    />
  );
};

export default QmsApqpWizardPage;
WIZARD_EOF

  info "已创建: $(basename "$dest")"
}

# =============================================================================
# 3. HrmEmployeeTimelinePage — 使用 TimelinePageTemplate
# =============================================================================
create_hrm_timeline_page() {
  local dest="${SRC_DIR}/pages/hrm/HrmEmployeeTimelinePage.tsx"
  idempotent_check "$dest" "TimelinePageTemplate 落地示范" || return 0
  ensure_dir "$dest"
  backup "$dest"

  cat > "$dest" << 'TIMELINE_EOF'
/**
 * HRM 员工职业发展时间线 — 使用 TimelinePageTemplate 展示员工履历和里程碑
 * TimelinePageTemplate 落地示范
 */
import React, { useMemo } from 'react';
import {
  TimelinePageTemplate,
  type TimelineNode,
  type TimelineGroup,
  type TimelineAction,
} from '@/components/templates/TimelinePageTemplate';
import { PageContainer } from '@/components/common';
import { Chip, Box, Typography } from '@mui/material';

const HrmEmployeeTimelinePage: React.FC = () => {
  const allNodes: TimelineNode[] = [
    {
      id: '1',
      title: '入职',
      date: '2020-03-15',
      description: '技术研发部 · 初级工程师',
      type: 'milestone',
      color: '#22C55E',
    },
    {
      id: '2',
      title: '晋升 — 中级工程师',
      date: '2021-06-01',
      description: '通过技术评审，承担核心模块开发',
      type: 'event',
      color: '#3B82F6',
    },
    {
      id: '3',
      title: '项目 — CRM系统升级',
      date: '2022-01-10',
      description: '担任技术负责人，带领5人团队',
      type: 'task',
      color: '#8B5CF6',
    },
    {
      id: '4',
      title: '培训 — PMP认证',
      date: '2022-08-20',
      description: '通过PMP项目管理认证考试',
      type: 'event',
      color: '#F59E0B',
    },
    {
      id: '5',
      title: '晋升 — 高级工程师',
      date: '2023-03-01',
      description: '技术委员会评审通过',
      type: 'milestone',
      color: '#3B82F6',
    },
    {
      id: '6',
      title: '项目 — MES系统实施',
      date: '2023-09-15',
      description: '主导制造执行系统上线',
      type: 'task',
      color: '#8B5CF6',
    },
    {
      id: '7',
      title: '调岗 — 技术经理',
      date: '2024-06-01',
      description: '研发组技术经理，管理12人团队',
      type: 'event',
      color: '#3B82F6',
    },
  ];

  const groups: TimelineGroup[] = useMemo(() => {
    const milestones = allNodes.filter((n) => n.type === 'milestone');
    const projects = allNodes.filter((n) => n.type === 'task');
    const events = allNodes.filter((n) => n.type === 'event');
    return [
      { id: 'milestone', title: '里程碑', color: '#22C55E', nodes: milestones, collapsible: false },
      { id: 'project', title: '项目经历', color: '#8B5CF6', nodes: projects, collapsible: true },
      { id: 'event', title: '人事变动', color: '#3B82F6', nodes: events, collapsible: true },
    ];
  }, [allNodes]);

  const actions: TimelineAction[] = [
    { label: '添加记录', onClick: () => console.log('Add timeline event') },
    { label: '导出履历', onClick: () => console.log('Export') },
    { label: '筛选', onClick: () => console.log('Filter') },
  ];

  return (
    <PageContainer title="员工发展时间线" subtitle="查看和管理员工职业发展轨迹">
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Chip label="张明远" color="primary" />
        <Chip label="李芳" variant="outlined" />
        <Chip label="王强" variant="outlined" />
      </Box>
      <TimelinePageTemplate
        nodes={allNodes}
        groups={groups}
        actions={actions}
        showSearch
        showFilter
      />
    </PageContainer>
  );
};

export default HrmEmployeeTimelinePage;
TIMELINE_EOF

  info "已创建: $(basename "$dest")"
}

# =============================================================================
# 4. LimsMethodDetailMasterPage — 使用 MasterDetailPageTemplate
# =============================================================================
create_lims_master_detail_page() {
  local dest="${SRC_DIR}/pages/lims/LimsMethodDetailMasterPage.tsx"
  idempotent_check "$dest" "MasterDetailPageTemplate 落地示范" || return 0
  ensure_dir "$dest"
  backup "$dest"

  cat > "$dest" << 'MASTER_EOF'
/**
 * LIMS 检测方法 — 主从详情页 — 使用 MasterDetailPageTemplate 展示方法列表 + 参数详情
 * MasterDetailPageTemplate 落地示范
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  MasterDetailPageTemplate,
  type MasterColumn,
  type PaginationConfig,
} from '@/components/templates/MasterDetailPageTemplate';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

interface TestMethod {
  id: string;
  name: string;
  code: string;
  category: string;
  standard: string;
  status: 'active' | 'draft' | 'deprecated';
  lastUpdated: string;
}

const LimsMethodDetailMasterPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const mockData: TestMethod[] = [
    { id: '1', name: '拉伸强度测试', code: 'TM-001', category: '力学', standard: 'GB/T 228.1-2021', status: 'active', lastUpdated: '2026-06-15' },
    { id: '2', name: '化学成分分析', code: 'TM-002', category: '化学', standard: 'GB/T 4336-2016', status: 'active', lastUpdated: '2026-06-10' },
    { id: '3', name: '金相组织检验', code: 'TM-003', category: '金相', standard: 'GB/T 13298-2015', status: 'active', lastUpdated: '2026-05-20' },
    { id: '4', name: '硬度测试', code: 'TM-004', category: '力学', standard: 'GB/T 230.1-2018', status: 'draft', lastUpdated: '2026-06-28' },
    { id: '5', name: '超声波探伤', code: 'TM-005', category: '无损检测', standard: 'GB/T 6402-2008', status: 'active', lastUpdated: '2026-04-15' },
    { id: '6', name: '盐雾试验', code: 'TM-006', category: '腐蚀', standard: 'GB/T 10125-2021', status: 'deprecated', lastUpdated: '2026-01-10' },
  ];

  const columns: MasterColumn<TestMethod>[] = [
    { id: 'code', label: '编号', width: 100, field: 'code', sortable: true },
    { id: 'name', label: '方法名称', width: 200, field: 'name', sortable: true },
    { id: 'category', label: '分类', width: 100, field: 'category', render: (val: any) => <Chip label={val} size="small" variant="outlined" /> },
    { id: 'standard', label: '标准依据', width: 180, field: 'standard' },
    { id: 'status', label: '状态', width: 100, field: 'status', render: (val: any) => {
      const colors: Record<string, 'success' | 'warning' | 'default'> = { active: 'success', draft: 'warning', deprecated: 'default' };
      const labels: Record<string, string> = { active: '启用', draft: '草稿', deprecated: '已废止' };
      return <Chip label={labels[val as string] ?? val} color={colors[val as string] ?? 'default'} size="small" />;
    }},
    { id: 'lastUpdated', label: '更新日期', width: 120, field: 'lastUpdated' },
  ];

  const pagination: PaginationConfig = {
    page: 1,
    pageSize: 10,
    total: mockData.length,
    onPageChange: (p) => console.log('Page:', p),
    onPageSizeChange: (s) => console.log('PageSize:', s),
  };

  const selectedItem = useMemo(
    () => (selectedId ? mockData.find((d) => d.id === selectedId) ?? null : null),
    [selectedId, mockData],
  );

  const renderDetail = useCallback(
    (item: TestMethod | null, ctx: any) => {
      if (!item) {
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              请从左侧列表选择一个检测方法
            </Typography>
          </Box>
        );
      }

      const parameters = [
        { name: '试样尺寸', value: '标准试样', range: '符合相关 GB 标准' },
        { name: '试验速度', value: '5 mm/min', range: '±0.2 mm/min' },
        { name: '温度范围', value: '23±5°C', range: '10-35°C' },
        { name: '湿度要求', value: '≤65%RH', range: '-' },
      ];

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="h6">{item.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip label={item.code} size="small" />
              <Chip label={item.category} size="small" variant="outlined" />
              <Chip
                label={item.status === 'active' ? '启用' : item.status === 'draft' ? '草稿' : '已废止'}
                color={item.status === 'active' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              检测参数
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>参数名</TableCell>
                    <TableCell>标准值</TableCell>
                    <TableCell>允许范围</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parameters.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.value}</TableCell>
                      <TableCell>{p.range}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      );
    },
    [],
  );

  return (
    <MasterDetailPageTemplate<TestMethod>
      title="检测方法管理"
      subtitle="主从结构：方法列表 + 参数详情"
      items={mockData}
      columns={columns}
      getRowId={(row) => row.id}
      selectedId={selectedId}
      onSelectRow={setSelectedId}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      renderDetail={renderDetail}
      pagination={pagination}
      actions={[
        { label: '新增方法', onClick: () => console.log('Add method') },
        { label: '导入', onClick: () => console.log('Import') },
        { label: '导出', onClick: () => console.log('Export') },
      ]}
    />
  );
};

export default LimsMethodDetailMasterPage;
MASTER_EOF

  info "已创建: $(basename "$dest")"
}

# =============================================================================
# 5. 路由注册
# =============================================================================

# 5a. pm.ts — 添加 /pm/kanban
register_pm_route() {
  local route_file="${SRC_DIR}/routes/pm.ts"
  local marker="PmProjectKanbanPage"
  idempotent_check "$route_file" "$marker" || return 0
  backup "$route_file"

  # 在 pm.ts 末尾的 ]; 之前插入 lazy import + 路由
  # 使用 Python 实现精确插入

  python3 << PYEOF
import re

filepath = "${route_file}"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 添加 lazy import (在最后一个 lazy(...) 之后)
lazy_import = '\nconst PmProjectKanbanPage = lazy(() => import('../pages/pm/PmProjectKanbanPage'));'

# 找到最后一个 lazy 行
last_lazy_pos = content.rfind('const PmProjectDashboardPage = lazy')
if last_lazy_pos == -1:
    last_lazy_pos = content.rfind("const Pm")
    # 在该行末尾追加
    end_of_line = content.index('\n', last_lazy_pos)
    content = content[:end_of_line] + lazy_import + content[end_of_line:]
else:
    end_of_line = content.index('\n', last_lazy_pos)
    content = content[:end_of_line] + lazy_import + content[end_of_line:]

# 2. 在 pmRoutes 数组的 ]; 前添加路由
route_entry = """  {
    path: '/pm/kanban',
    element: PmProjectKanbanPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
"""

# 找到 '];\n' 并在其前面插入
closing = content.rfind('];')
if closing == -1:
    raise RuntimeError("Cannot find '];' in pm.ts")
content = content[:closing] + route_entry + content[closing:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("  pm.ts 路由已注册: /pm/kanban")
PYEOF
}

# 5b. hrm.ts — 添加 /hrm/employee-timeline
register_hrm_route() {
  local route_file="${SRC_DIR}/routes/hrm.ts"
  local marker="HrmEmployeeTimelinePage"
  idempotent_check "$route_file" "$marker" || return 0
  backup "$route_file"

  python3 << PYEOF
filepath = "${route_file}"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 添加 lazy import
lazy_import = "\nconst HrmEmployeeTimelinePage = lazy(() => import('../pages/hrm/HrmEmployeeTimelinePage'));"
last_lazy_pos = content.rfind('const HrmReportsPage = lazy')
end_of_line = content.index('\n', last_lazy_pos)
content = content[:end_of_line] + lazy_import + content[end_of_line:]

# 2. 添加路由
route_entry = """  {
    path: '/hrm/employee-timeline',
    element: HrmEmployeeTimelinePage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
"""
closing = content.rfind('];')
content = content[:closing] + route_entry + content[closing:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("  hrm.ts 路由已注册: /hrm/employee-timeline")
PYEOF
}

# 5c. professional.ts — 添加 /qms/apqp-wizard 和 /lims/method-detail
register_professional_routes() {
  local route_file="${SRC_DIR}/routes/professional.ts"
  local marker="QmsApqpWizardPage"
  idempotent_check "$route_file" "$marker" || return 0
  backup "$route_file"

  python3 << 'PYEOF'
filepath = "/Users/air/TOPEMS/apps/web/src/routes/professional.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 添加 lazy imports
lazy_import_qms = "\nconst QmsApqpWizardPage = lazy(() => import('../pages/qms/QmsApqpWizardPage'));"
lazy_import_lims = "\nconst LimsMethodDetailMasterPage = lazy(() => import('../pages/lims/LimsMethodDetailMasterPage'));"

# 在 QmsFmeaPage 之后插入 QMS import
pos = content.rfind('const QmsFmeaPage = lazy')
if pos != -1:
    end_of_line = content.index('\n', pos)
    content = content[:end_of_line] + lazy_import_qms + content[end_of_line:]

# 在 LimsInstrumentDataPage 之后插入 LIMS import
pos = content.rfind('const LimsInstrumentDataPage = lazy')
if pos != -1:
    end_of_line = content.index('\n', pos)
    content = content[:end_of_line] + lazy_import_lims + content[end_of_line:]

# 2. 添加路由 — /qms/apqp-wizard (在 /qms/fmea 之后)
qms_route = """  {
    path: '/qms/apqp-wizard',
    element: QmsApqpWizardPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
"""

# 在 /qms/fmea 路由之后插入
fmea_pos = content.find("path: '/qms/fmea'")
if fmea_pos != -1:
    # 找到这个路由块的结尾 '},\n'
    block_end = content.find('},\n', fmea_pos)
    if block_end != -1:
        insert_pos = block_end + 3  # 跳过 '},\n'
        content = content[:insert_pos] + qms_route + content[insert_pos:]

# 3. 添加路由 — /lims/method-detail (在 /lims/instrument-data 之后)
lims_route = """  {
    path: '/lims/method-detail',
    element: LimsMethodDetailMasterPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
"""

instr_data_pos = content.find("path: '/lims/instrument-data'")
if instr_data_pos != -1:
    block_end = content.find('},\n', instr_data_pos)
    if block_end != -1:
        insert_pos = block_end + 3
        content = content[:insert_pos] + lims_route + content[insert_pos:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("  professional.ts 路由已注册: /qms/apqp-wizard, /lims/method-detail")
PYEOF
}

# =============================================================================
# MAIN
# =============================================================================
main() {
  echo "======================================================================"
  echo "  Phase 4.4 — Template Landing"
  echo "======================================================================"
  echo ""

  echo "[1/5] 创建 PmProjectKanbanPage ..."
  create_pm_kanban_page

  echo "[2/5] 创建 QmsApqpWizardPage ..."
  create_qms_apqp_wizard_page

  echo "[3/5] 创建 HrmEmployeeTimelinePage ..."
  create_hrm_timeline_page

  echo "[4/5] 创建 LimsMethodDetailMasterPage ..."
  create_lims_master_detail_page

  echo "[5/5] 注册路由 ..."
  register_pm_route
  register_hrm_route
  register_professional_routes

  echo ""
  echo "======================================================================"
  echo "  Phase 4.4 Template Landing: DONE"
  echo "======================================================================"
  echo ""
  echo "新增文件:"
  echo "  pages/pm/PmProjectKanbanPage.tsx       → /pm/kanban"
  echo "  pages/qms/QmsApqpWizardPage.tsx        → /qms/apqp-wizard"
  echo "  pages/hrm/HrmEmployeeTimelinePage.tsx   → /hrm/employee-timeline"
  echo "  pages/lims/LimsMethodDetailMasterPage.tsx → /lims/method-detail"
  echo ""
  echo "修改文件:"
  echo "  routes/pm.ts          (+1 lazy import, +1 route)"
  echo "  routes/hrm.ts         (+1 lazy import, +1 route)"
  echo "  routes/professional.ts (+2 lazy imports, +2 routes)"
  echo ""
  echo "备份文件后缀: ${BACKUP_SUFFIX}"
}

main "$@"
