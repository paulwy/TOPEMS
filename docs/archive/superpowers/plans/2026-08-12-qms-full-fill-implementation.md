# QMS Full-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 QMS 模块从骨架（16 backend modules + 12 pages + 13 API client）→ 四层契约 100% 对齐 + 7 FSM 含 ≥42 单测 + 6 BI 深度分析页 + 6 Detail 页 + 4 类审批工作流；五重验收全绿（TS 型检 / Rust 严格 / 导航三重 / vitest ≥80% / cargo test ≥50 用例）。

**Architecture:** 方案 A · 垂直 6 大任务串行。四层契约垂直栈：L1 Schema（V69.3 TABLE_DEFS 33 表已验）→ L2 API Client（types/qms.ts 新建 + 13 文件签名绑定）→ L3 Route+Handler（permission 三段式 + 审批端点 + audit 日志）→ L4 Model/DTO（models/ 独立 7 文件集中导出）。FSM 沿用 `shared/fsm.rs` 函数式 `xxx_can_transition` 模式新建 7 套。BI 页采用 recharts + useQmsMock hook 模式。

**Tech Stack:**
- **前端:** TypeScript 5.6 + React 18 + recharts 2 + vitest（apps/web/src）
- **后端:** Rust nightly-2026-07-01 + Axum + utoipa + sqlx（svc/qms）
- **测试:** cargo test -p topems-qms（≥50 用例）+ vitest --coverage src/pages/qms（≥80%）
- **FSM:** 函数式 `xxx_can_transition(from, to) -> Result<(), FsmError>` + `requires_approval` 标记

---

## File Structure（创建/修改清单，按任务分类）

### Task 1 · TypeScript 类型底座

**创建文件:**
- `apps/web/src/types/qms.ts` — 10 实体全量 DTO（单一事实源，与 svc/qms/src/models/*.rs 1:1 对齐）
- `apps/web/src/api/qms/_mock.ts` — useQmsMock hook + 10 实体 mock 数据

**修改文件:**
- `apps/web/src/api/qms/types.ts` — 追加 7 FSM 状态枚举 + Audit/APQP Backend/Frontend 双套 + 审批 DTO + BI 聚合类型
- `apps/web/src/api/qms/adapters.ts` — 追加 Audit/APQP adapter 函数
- `apps/web/src/api/qms/index.ts` — 追加 approval 导出

### Task 2 · Rust 契约对齐 + DTO 独立

**创建文件:**
- `svc/qms/src/models/quality_standard.rs` — DTO 结构体集中定义
- `svc/qms/src/models/quality_inspection.rs` — DTO 结构体集中定义
- `svc/qms/src/models/quality_issue.rs` — DTO 结构体集中定义
- `svc/qms/src/models/corrective_action.rs` — DTO 结构体集中定义
- `svc/qms/src/models/audit.rs` — AuditPlan + AuditTask + AuditFinding DTO
- `svc/qms/src/models/apqp.rs` — ApqpProject + Phase + Task + Risk + Approval DTO
- `svc/qms/src/models/spc.rs` — SpcChart + SpcDataPoint + ControlLimits DTO
- `svc/qms/src/models/quality_cost.rs` — QualityCost + Statistics DTO
- `svc/qms/src/models/eight_d.rs` — EightDReport + AuditLog DTO
- `svc/qms/src/models/fmea.rs` — FmeaAnalysis + FmeaItem + Statistics DTO

**修改文件:**
- `svc/qms/src/models/mod.rs` — 追加 10 实体 DTO pub mod + re-export
- `svc/qms/src/shared/mod.rs` — 追加 `pub mod fsm;` 声明
- `svc/qms/src/shared/permission.rs` — 追加 QmsApprove 权限段
- `svc/qms/src/modules/quality_standard.rs` — 改为 import models::quality_standard
- `svc/qms/src/modules/quality_inspection.rs` — 改为 import models::quality_inspection + 移除内嵌 FSM
- `svc/qms/src/modules/quality_issue.rs` — 改为 import models::quality_issue
- `svc/qms/src/modules/corrective_action.rs` — 改为 import models::corrective_action
- `svc/qms/src/modules/audit.rs` — 改为 import models::audit
- `svc/qms/src/modules/apqp.rs` — 改为 import models::apqp
- `svc/qms/src/modules/spc.rs` — 改为 import models::spc + 追加 ToSchema
- `svc/qms/src/modules/quality_cost.rs` — 改为 import models::quality_cost
- `svc/qms/src/modules/eight_d.rs` — 改为 import models::eight_d + 追加 ToSchema
- `svc/qms/src/modules/fmea.rs` — 改为 import models::fmea + 追加 ToSchema
- `svc/qms/src/services/mod.rs` — 填充 service 层 trait + 实现

### Task 3 · 7 FSM + 单测 + 前端徽章

**创建文件:**
- `svc/qms/src/shared/fsm.rs` — 7 套 FSM（inspection/issue/action/audit_plan/audit_finding/eight_d/apqp）
- `svc/qms/src/shared/fsm_test.rs` — 7 FSM × ≥6 = ≥42 单测
- `apps/web/src/components/qms/StatusBadge.tsx` — 7 FSM 统一状态徽章组件
- `apps/web/src/components/qms/FSMActionButtons.tsx` — 按可达性动态禁用操作按钮
- `apps/web/src/components/qms/__tests__/StatusBadge.test.tsx` — 7 FSM 徽章颜色+可达性测试

**修改文件:**
- `svc/qms/src/shared/mod.rs` — 追加 `pub mod fsm_test;`（cfg test）

### Task 4 · 6 BI 分析页 + 6 Detail 页

**创建文件:**
- `apps/web/src/pages/qms/analytics/QmsQualityTrendPage.tsx` — 质量趋势分析
- `apps/web/src/pages/qms/analytics/QmsDefectParetoPage.tsx` — 缺陷帕累托图
- `apps/web/src/pages/qms/analytics/QmsCostAnalysisPage.tsx` — 质量成本分析（PAF 模型）
- `apps/web/src/pages/qms/analytics/QmsSpcControlChartPage.tsx` — SPC 控制图
- `apps/web/src/pages/qms/analytics/QmsFmeaRiskMatrixPage.tsx` — FMEA 风险矩阵
- `apps/web/src/pages/qms/analytics/QmsAuditCompliancePage.tsx` — 审核合规率
- `apps/web/src/pages/qms/analytics/__tests__/QmsAnalyticsPages.test.tsx`
- `apps/web/src/pages/qms/QmsInspectionDetailPage.tsx` — 质检详情（结果项 + 审核日志 Tab）
- `apps/web/src/pages/qms/QmsIssueDetailPage.tsx` — 质量问题详情（纠正措施 Tab）
- `apps/web/src/pages/qms/QmsApqpDetailPage.tsx` — APQP 详情（阶段/任务/风险/审批 4 Tab）
- `apps/web/src/pages/qms/QmsEightDDetailPage.tsx` — 8D 报告详情（D1-D8 步骤）
- `apps/web/src/pages/qms/QmsFmeaDetailPage.tsx` — FMEA 详情（FMEA 项子表 + RPN 计算）
- `apps/web/src/pages/qms/QmsSpcChartDetailPage.tsx` — SPC 控制图详情（数据点 + 控制限）

**修改文件:**
- `apps/web/src/modules/qms/config.ts` — 追加 6 条 analytics 路由 + 6 条 Detail 路由

### Task 5 · 4 类审批工作流

**修改文件:**
- `svc/qms/src/modules/quality_inspection.rs` — APV-1 审批 3 端点实现
- `svc/qms/src/modules/quality_issue.rs` — APV-2 审批 3 端点实现
- `svc/qms/src/modules/eight_d.rs` — APV-3 审批 3 端点实现
- `svc/qms/src/modules/apqp.rs` — APV-4 审批 3 端点实现
- `svc/qms/src/models/audit_log.rs` — 追加 approval_event 审计函数

**创建文件:**
- `svc/qms/tests/approval_endpoints_test.rs` — 4 类审批 × 2 = 8 单测

### Task 6 · 五重验收

**创建文件:**
- `apps/web/src/api/__tests__/qms-contract.test.ts` — 前端契约一致性测试
- `scripts/dev/check-qms-nav.mjs` — QMS 导航三重校验脚本

**修改文件:**
- `docs/roadmap/TODO.md` — 追加 V198-V204 验收章节

---

## Task 1: TypeScript 类型底座

**目标:** `types/qms.ts` 新建为 10 实体全量 DTO（单一事实源）；`api/qms/types.ts` 追加 7 FSM 状态枚举 + Audit/APQP Backend/Frontend 双套 + 审批 DTO + BI 类型；`api/qms/_mock.ts` 新建 mock 设施。

- [ ] **Step 1: 创建 `apps/web/src/types/qms.ts`**

```typescript
// apps/web/src/types/qms.ts
// QMS 模块全量 DTO — 单一事实源（与 svc/qms/src/models/*.rs 1:1 对齐）

// ==================== E-1 QualityStandard ====================
export interface QualityStandard {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category: string;
  level: string;
  specification: string | null;
  description: string | null;
  version: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityStandardRequest {
  name: string;
  category: string;
  level: string;
  specification?: string;
  description?: string;
  version: string;
  created_by?: string;
}

export interface UpdateQualityStandardRequest {
  name?: string;
  category?: string;
  level?: string;
  specification?: string;
  description?: string;
  version?: string;
  status?: string;
}

export interface StandardRevision {
  id: string;
  tenant_id: string;
  standard_id: string;
  version: string;
  name: string;
  category: string;
  level: string;
  specification: string | null;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

// ==================== E-2 QualityInspection ====================
export interface QualityInspection {
  id: string;
  tenant_id: string;
  inspection_no: string;
  inspection_type: string;
  product_id: string | null;
  product_name: string | null;
  standard_id: string | null;
  quantity: number;
  qualified_quantity: number | null;
  unqualified_quantity: number | null;
  qualification_rate: number | null;
  status: string;
  inspector: string | null;
  assignee: string | null;
  inspected_at: string | null;
  result: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQualityInspectionRequest {
  inspection_type: string;
  product_id?: string;
  product_name?: string;
  standard_id?: string;
  quantity: number;
  created_by?: string;
}

export interface SubmitInspectionResultRequest {
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate?: number;
  result?: string;
  memo?: string;
  inspector: string;
  results?: InspectionResultItem[];
}

export interface InspectionResultItem {
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
}

export interface InspectionAudit {
  id: string;
  tenant_id: string;
  inspection_id: string;
  status_from: string;
  status_to: string;
  action: string;
  operator: string;
  comment: string | null;
  created_at: string;
}

// ==================== E-3 QualityIssue ====================
export interface QualityIssue {
  id: string;
  tenant_id: string;
  issue_no: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  source: string | null;
  related_inspection_id: string | null;
  assigned_to: string | null;
  priority: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
}

export interface CreateQualityIssueRequest {
  title: string;
  description?: string;
  severity: string;
  source?: string;
  related_inspection_id?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
  created_by?: string;
}

// ==================== E-4 CorrectiveAction ====================
export interface CorrectiveAction {
  id: string;
  tenant_id: string;
  action_no: string;
  issue_id: string;
  title: string;
  description: string | null;
  root_cause: string | null;
  action_type: string;
  status: string;
  priority: string;
  assignee: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  tenant_id: string;
  action_id: string;
  item_name: string;
  responsible: string;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  remark: string | null;
  created_at: string;
}

// ==================== E-5 AuditPlan + AuditTask + AuditFinding ====================
export interface AuditPlan {
  id: string;
  tenant_id: string;
  plan_no: string;
  title: string;
  audit_type: string;
  scope: string | null;
  standard_id: string | null;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditTask {
  id: string;
  tenant_id: string;
  task_no: string;
  plan_id: string;
  title: string;
  description: string | null;
  auditor: string | null;
  status: string;
  completed_at: string | null;
  finding_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuditFinding {
  id: string;
  tenant_id: string;
  finding_no: string;
  task_id: string;
  plan_id: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  status: string;
  recommendation: string | null;
  responsible: string | null;
  target_date: string | null;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== E-6 SpcChart + SpcDataPoint ====================
export interface SpcChart {
  id: string;
  tenant_id: string;
  chart_no: string;
  chart_name: string;
  chart_type: string;
  product_id: string | null;
  product_name: string | null;
  process_id: string | null;
  process_name: string | null;
  characteristic: string;
  unit: string | null;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  ucl: number | null;
  lcl: number | null;
  cl: number | null;
  sample_size: number;
  sampling_frequency: string | null;
  status: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpcDataPoint {
  id: string;
  chart_id: string;
  sample_no: number;
  sample_time: string;
  values: number[];
  mean: number | null;
  range: number | null;
  std_dev: number | null;
  is_out_of_control: boolean;
  violation_rules: string | null;
  operator: string | null;
  remark: string | null;
  created_at: string;
}

export interface ControlLimitsResult {
  ucl: number;
  lcl: number;
  cl: number;
  usl: number | null;
  lsl: number | null;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  mean: number | null;
  std_dev: number | null;
  data_points_count: number;
}

// ==================== E-7 QualityCost ====================
export interface QualityCost {
  id: string;
  tenant_id: string;
  cost_no: string;
  cost_category: string;
  cost_type: string;
  amount: number;
  department: string | null;
  description: string | null;
  related_issue_id: string | null;
  incurred_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityCostStatistics {
  total_cost: number;
  prevention_cost: number;
  appraisal_cost: number;
  internal_failure_cost: number;
  external_failure_cost: number;
  cost_by_category: { category: string; total_amount: number; count: number; percentage: number }[];
  cost_by_department: { department: string; total_amount: number; count: number; percentage: number }[];
}

// ==================== E-8 EightDReport ====================
export interface EightDReport {
  id: string;
  tenant_id: string;
  report_no: string;
  title: string;
  problem_description: string;
  severity: string;
  source: string | null;
  related_issue_id: string | null;
  product_id: string | null;
  product_name: string | null;
  customer: string | null;
  status: string;
  current_stage: string;
  team_leader: string | null;
  team_members: string | null;
  d1_team_established: string | null;
  d2_problem_described: string | null;
  d3_containment_actions: string | null;
  d4_root_cause: string | null;
  d5_permanent_actions: string | null;
  d6_effectiveness_verified: string | null;
  d7_preventive_actions: string | null;
  d8_team_recognized: string | null;
  due_date: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EightDAuditLog {
  id: string;
  tenant_id: string;
  report_id: string;
  action: string;
  stage: string | null;
  operator: string;
  remark: string | null;
  created_at: string;
}

// ==================== E-9 FmeaAnalysis + FmeaItem ====================
export interface FmeaAnalysis {
  id: string;
  tenant_id: string;
  fmea_no: string;
  fmea_name: string;
  fmea_type: string;
  product_id: string | null;
  product_name: string | null;
  process_id: string | null;
  process_name: string | null;
  version: string | null;
  status: string;
  scope: string | null;
  team_leader: string | null;
  team_members: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmeaItem {
  id: string;
  tenant_id: string;
  fmea_id: string;
  item_no: number;
  function_description: string;
  failure_mode: string;
  failure_effect: string;
  severity: number;
  failure_cause: string;
  occurrence: number;
  current_controls: string | null;
  detection: number;
  rpn: number;
  recommended_actions: string | null;
  responsibility: string | null;
  target_date: string | null;
  actions_taken: string | null;
  severity_revised: number | null;
  occurrence_revised: number | null;
  detection_revised: number | null;
  rpn_revised: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FmeaStatistics {
  total_items: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_rpn: number;
  max_rpn: number;
}

// ==================== E-10 ApqpProject + Phase + Task + Risk + Approval ====================
export interface ApqpProject {
  id: string;
  tenant_id: string;
  project_no: string;
  project_name: string;
  product_id: string | null;
  product_name: string | null;
  customer: string | null;
  description: string | null;
  status: string;
  current_phase: string | null;
  leader: string | null;
  team: string | null;
  start_date: string | null;
  target_date: string | null;
  actual_end_date: string | null;
  progress: number;
  risk_level: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApqpPhase {
  id: string;
  tenant_id: string;
  project_id: string;
  phase_code: string;
  phase_name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  progress: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApqpTask {
  id: string;
  tenant_id: string;
  project_id: string;
  phase_id: string;
  task_name: string;
  description: string | null;
  task_type: string | null;
  deliverable: string | null;
  status: string;
  assignee: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApqpRisk {
  id: string;
  tenant_id: string;
  project_id: string;
  risk_name: string;
  description: string | null;
  risk_category: string | null;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  status: string;
  mitigation_plan: string | null;
  responsible: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApqpApproval {
  id: string;
  tenant_id: string;
  project_id: string;
  approval_type: string;
  status: string;
  applicant: string | null;
  approver: string | null;
  comment: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

// ==================== FSM 状态枚举 ====================
export const INSPECTION_STATES = ['pending', 'in_progress', 'pending_audit', 'completed', 'rejected'] as const;
export const ISSUE_STATES = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const;
export const ACTION_STATES = ['pending', 'in_progress', 'completed', 'verified', 'cancelled'] as const;
export const AUDIT_PLAN_STATES = ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export const AUDIT_FINDING_STATES = ['open', 'in_progress', 'verified', 'closed'] as const;
export const EIGHT_D_STATES = ['initiated', 'in_progress', 'containment', 'root_cause', 'permanent_action', 'verified', 'closed', 'cancelled'] as const;
export const APQP_STATES = ['planning', 'in_design', 'in_pilot', 'in_production', 'completed', 'cancelled'] as const;

// ==================== 审批 DTO ====================
export interface ApprovalRequest {
  entity_id: string;
  entity_type: 'inspection' | 'issue' | 'eight_d' | 'apqp';
  action: 'approve' | 'reject' | 'rework' | 'cancel';
  operator: string;
  comment?: string;
}

export interface ApprovalResponse {
  success: boolean;
  entity_id: string;
  previous_status: string;
  current_status: string;
  approval_id: string | null;
  message: string;
}

// ==================== BI 聚合类型 ====================
export interface QualityOverview {
  total_inspections: number;
  qualified_inspections: number;
  unqualified_inspections: number;
  qualification_rate: number;
  defect_rate: number;
  total_issues: number;
  open_issues: number;
  complaint_count: number;
  in_progress_eightd: number;
  pending_actions: number;
}

export interface QualityTrendItem {
  period: string;
  total_count: number;
  qualified_count: number;
  qualification_rate: number;
  issue_count: number;
}

export interface DefectDistribution {
  category: string;
  count: number;
  percentage: number;
}
```

- [ ] **Step 2: 追加 `apps/web/src/api/qms/types.ts` — Audit/APQP Frontend camelCase 类型**

在文件末尾追加 Audit 和 APQP 的 Frontend camelCase 类型，以及对应 adapter 函数的类型签名。确保与 Backend 类型字段 1:1 映射，仅命名风格转换（snake_case → camelCase）。

- [ ] **Step 3: 追加 `apps/web/src/api/qms/adapters.ts` — Audit/APQP adapter 函数**

追加 `adaptAuditPlanToFrontend/ToBackend`、`adaptAuditTaskToFrontend`、`adaptAuditFindingToFrontend`、`adaptApqpProjectToFrontend/ToBackend`、`adaptApqpPhaseToFrontend`、`adaptApqpTaskToFrontend`、`adaptApqpRiskToFrontend`、`adaptApqpApprovalToFrontend`。

- [ ] **Step 4: 创建 `apps/web/src/api/qms/_mock.ts`**

创建 useQmsMock hook，导出 10 实体的 mock 数据生成函数，以及 QualityOverview / QualityTrendItem / DefectDistribution 的 mock 数据。参考 `apps/web/src/api/crm/_mock.ts` 的模式。

- [ ] **Step 5: 追加 `apps/web/src/api/qms/index.ts` — approval 导出**

追加 `qmsApprovalApi` 导出，包含 approve/reject/rework/cancel 4 个方法。

- [ ] **Step 6: 验证 TypeScript 编译**

Run: `cd apps/web && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -c "error TS"`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/types/qms.ts apps/web/src/api/qms/_mock.ts apps/web/src/api/qms/types.ts apps/web/src/api/qms/adapters.ts apps/web/src/api/qms/index.ts
git commit -m "feat(qms): add types/qms.ts single source of truth + Audit/APQP dual types + mock facility"
```

---

## Task 2: Rust 契约对齐 + DTO 独立

**目标:** 将 10 实体的 DTO 从 `modules/*.rs` 提取到 `models/*.rs` 独立文件；所有结构体追加 `ToSchema` derive；`services/mod.rs` 填充 service 层 trait。

- [ ] **Step 1: 创建 `svc/qms/src/models/quality_standard.rs`**

将 `modules/quality_standard.rs` 中的 StandardQuery、ListStandardsResponse、QualityStandard、CreateStandardRequest、UpdateStandardRequest、StandardRevision 结构体移到此文件。所有结构体追加 `#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]`（FromRow 仅对数据库模型保留）。

- [ ] **Step 2: 创建 `svc/qms/src/models/quality_inspection.rs`**

将 `modules/quality_inspection.rs` 中的 InspectionQuery、ListInspectionsResponse、Inspection、CreateInspectionRequest、AssignInspectionRequest、SubmitInspectionResultRequest、InspectionResultItem、AuditInspectionRequest、UpdateInspectionRequest、InspectionAudit、InspectionResult 结构体移到此文件。

- [ ] **Step 3: 创建 `svc/qms/src/models/quality_issue.rs`**

将 `modules/quality_issue.rs` 中的 IssueQuery、QualityIssue、QualityIssueWithWorkflow、CreateIssueRequest、UpdateIssueRequest 结构体移到此文件。

- [ ] **Step 4: 创建 `svc/qms/src/models/corrective_action.rs`**

将 `modules/corrective_action.rs` 中的 ActionQuery、ListActionsResponse、CorrectiveAction、ActionItem、CreateActionRequest、CreateActionItemRequest、UpdateActionRequest 结构体移到此文件。

- [ ] **Step 5: 创建 `svc/qms/src/models/audit.rs`**

新建 AuditPlan、AuditTask、AuditFinding 及其 Query/Create/Update 结构体，字段与前端 types/qms.ts E-5 1:1 对齐。所有结构体追加 `#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]`。

- [ ] **Step 6: 创建 `svc/qms/src/models/apqp.rs`**

新建 ApqpProject、ApqpPhase、ApqpTask、ApqpRisk、ApqpApproval、ApqpProgressStatistics、PhaseProgress、StatusTransitionRequest 结构体，字段与前端 types/qms.ts E-10 1:1 对齐。

- [ ] **Step 7: 创建 `svc/qms/src/models/spc.rs`**

将 `modules/spc.rs` 中的 SpcChart、SpcDataPoint、ControlLimitsResult 及其 Query/Create/Update 结构体移到此文件。

- [ ] **Step 8: 创建 `svc/qms/src/models/quality_cost.rs`**

将 `modules/quality_cost.rs` 中的 QualityCost、CostCategorySummary、CostTrendItem、CostDepartmentSummary、QualityCostStatistics 及其 Query/Create/Update 结构体移到此文件。

- [ ] **Step 9: 创建 `svc/qms/src/models/eight_d.rs`**

将 `modules/eight_d.rs` 中的 EightDReport、EightDAuditLog 及其 Query/Create/Update 结构体移到此文件。

- [ ] **Step 10: 创建 `svc/qms/src/models/fmea.rs`**

将 `modules/fmea.rs` 中的 FmeaAnalysis、FmeaItem、FmeaStatistics 及其 Query/Create/Update 结构体移到此文件。

- [ ] **Step 11: 修改 `svc/qms/src/models/mod.rs`**

```rust
pub mod audit_log;
pub mod schema_defense;
pub mod quality_standard;
pub mod quality_inspection;
pub mod quality_issue;
pub mod corrective_action;
pub mod audit;
pub mod apqp;
pub mod spc;
pub mod quality_cost;
pub mod eight_d;
pub mod fmea;

pub use quality_standard::*;
pub use quality_inspection::*;
pub use quality_issue::*;
pub use corrective_action::*;
pub use audit::*;
pub use apqp::*;
pub use spc::*;
pub use quality_cost::*;
pub use eight_d::*;
pub use fmea::*;
```

- [ ] **Step 12: 修改 `svc/qms/src/shared/mod.rs` — 追加 fsm 声明**

```rust
pub mod permission;
pub mod fsm;
```

- [ ] **Step 13: 修改 `svc/qms/src/shared/permission.rs` — 追加审批权限**

在 QmsPermission 枚举中追加：
```rust
    InspectionApprove,
    IssueApprove,
    EightdApprove,
    ApqpApprove,
```

在 `to_shared()` 中追加对应的 `PermissionAction::Admin` 映射。

- [ ] **Step 14: 修改各 modules/*.rs — 改为 import models**

在 `quality_standard.rs`、`quality_inspection.rs`、`quality_issue.rs`、`corrective_action.rs`、`audit.rs`、`apqp.rs`、`spc.rs`、`quality_cost.rs`、`eight_d.rs`、`fmea.rs` 的开头，将结构体定义替换为：
```rust
use crate::models::quality_standard::*;
```
保留 handler 函数和路由定义不变。移除 `quality_inspection.rs` 中的 `validate_status_transition` 和 `get_action_name` 函数（Task 3 将在 `shared/fsm.rs` 中重新实现）。

- [ ] **Step 15: 填充 `svc/qms/src/services/mod.rs`**

```rust
//! QMS service layer — business logic abstraction

use crate::models::*;
use sqlx::PgPool;

pub trait QualityStandardService: Send + Sync {
    async fn list_standards(&self, pool: &PgPool, query: &StandardQuery) -> Result<ListStandardsResponse, sqlx::Error>;
    async fn get_standard(&self, pool: &PgPool, id: &str) -> Result<Option<QualityStandard>, sqlx::Error>;
    async fn create_standard(&self, pool: &PgPool, req: &CreateStandardRequest) -> Result<QualityStandard, sqlx::Error>;
}

pub trait QualityInspectionService: Send + Sync {
    async fn list_inspections(&self, pool: &PgPool, query: &InspectionQuery) -> Result<ListInspectionsResponse, sqlx::Error>;
    async fn create_inspection(&self, pool: &PgPool, req: &CreateInspectionRequest) -> Result<Inspection, sqlx::Error>;
}
```

- [ ] **Step 16: 验证 cargo check**

Run: `cargo check -p topems-qms 2>&1 | grep -E "^error" | wc -l`
Expected: 0 errors

- [ ] **Step 17: Commit**

```bash
git add svc/qms/src/models/ svc/qms/src/shared/mod.rs svc/qms/src/shared/permission.rs svc/qms/src/modules/ svc/qms/src/services/mod.rs
git commit -m "feat(qms): extract 10 entity DTOs to models/ + ToSchema registration + services layer"
```

---

## Task 3: 7 FSM + 单测 + 前端徽章

**目标:** 创建 `shared/fsm.rs` 含 7 套 FSM（inspection/issue/action/audit_plan/audit_finding/eight_d/apqp），每套含 `can_transition` + `requires_approval` + `is_valid_status`；`fsm_test.rs` ≥42 单测；前端 StatusBadge + FSMActionButtons 组件。

- [ ] **Step 1: 创建 `svc/qms/src/shared/fsm.rs`**

```rust
//! QMS 7 状态机定义
//!
//! FSM-1 Inspection:  pending → in_progress → pending_audit → completed/rejected
//! FSM-2 Issue:       open → in_progress → resolved → closed/cancelled
//! FSM-3 Action:      pending → in_progress → completed → verified/cancelled
//! FSM-4 AuditPlan:   draft → scheduled → in_progress → completed/cancelled
//! FSM-5 AuditFinding: open → in_progress → verified → closed
//! FSM-6 EightD:      initiated → in_progress → containment → root_cause → permanent_action → verified → closed/cancelled
//! FSM-7 Apqp:        planning → in_design → in_pilot → in_production → completed/cancelled

#[derive(Debug, thiserror::Error, PartialEq)]
pub enum FsmError {
    #[error("state '{0}' is terminal and cannot transition")]
    TerminalState(String),
    #[error("invalid transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
    #[error("unknown status: {0}")]
    UnknownStatus(String),
}

fn validate_status(status: &str, allowed: &[&str]) -> Result<(), FsmError> {
    if allowed.contains(&status) {
        Ok(())
    } else {
        Err(FsmError::UnknownStatus(status.to_string()))
    }
}

fn check_pair(
    from: &str,
    to: &str,
    allowed_pairs: &[(&str, &str)],
    terminal: &[&str],
    all_states: &[&str],
) -> Result<(), FsmError> {
    validate_status(from, all_states)?;
    validate_status(to, all_states)?;
    if terminal.contains(&from) {
        return Err(FsmError::TerminalState(from.to_string()));
    }
    if allowed_pairs.contains(&(from, to)) {
        Ok(())
    } else {
        Err(FsmError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        })
    }
}

// ==================== FSM-1: QualityInspection ====================
const INSPECTION_STATES: &[&str] = &["pending", "in_progress", "pending_audit", "completed", "rejected"];
const INSPECTION_TERMINAL: &[&str] = &["completed"];
const INSPECTION_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("pending_audit", "completed"), ("pending_audit", "rejected")];

pub fn inspection_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "pending_audit"),
        ("pending_audit", "completed"),
        ("pending_audit", "rejected"),
        ("rejected", "in_progress"),
    ];
    check_pair(from, to, allowed_pairs, INSPECTION_TERMINAL, INSPECTION_STATES)
}

pub fn inspection_requires_approval(from: &str, to: &str) -> bool {
    INSPECTION_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_inspection_status(s: &str) -> bool {
    INSPECTION_STATES.contains(&s)
}

// ==================== FSM-2: QualityIssue ====================
const ISSUE_STATES: &[&str] = &["open", "in_progress", "resolved", "closed", "cancelled"];
const ISSUE_TERMINAL: &[&str] = &["closed", "cancelled"];
const ISSUE_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("resolved", "closed")];

pub fn issue_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("open", "in_progress"),
        ("in_progress", "resolved"),
        ("in_progress", "open"),
        ("resolved", "closed"),
        ("resolved", "in_progress"),
        ("open", "cancelled"),
        ("in_progress", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, ISSUE_TERMINAL, ISSUE_STATES)
}

pub fn issue_requires_approval(from: &str, to: &str) -> bool {
    ISSUE_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_issue_status(s: &str) -> bool {
    ISSUE_STATES.contains(&s)
}

// ==================== FSM-3: CorrectiveAction ====================
const ACTION_STATES: &[&str] = &["pending", "in_progress", "completed", "verified", "cancelled"];
const ACTION_TERMINAL: &[&str] = &["verified", "cancelled"];
const ACTION_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("completed", "verified")];

pub fn action_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "completed"),
        ("in_progress", "pending"),
        ("completed", "verified"),
        ("completed", "in_progress"),
        ("pending", "cancelled"),
        ("in_progress", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, ACTION_TERMINAL, ACTION_STATES)
}

pub fn action_requires_approval(from: &str, to: &str) -> bool {
    ACTION_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_action_status(s: &str) -> bool {
    ACTION_STATES.contains(&s)
}

// ==================== FSM-4: AuditPlan ====================
const AUDIT_PLAN_STATES: &[&str] = &["draft", "scheduled", "in_progress", "completed", "cancelled"];
const AUDIT_PLAN_TERMINAL: &[&str] = &["completed", "cancelled"];
const AUDIT_PLAN_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("in_progress", "completed")];

pub fn audit_plan_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("draft", "scheduled"),
        ("draft", "cancelled"),
        ("scheduled", "in_progress"),
        ("scheduled", "cancelled"),
        ("in_progress", "completed"),
        ("in_progress", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, AUDIT_PLAN_TERMINAL, AUDIT_PLAN_STATES)
}

pub fn audit_plan_requires_approval(from: &str, to: &str) -> bool {
    AUDIT_PLAN_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_audit_plan_status(s: &str) -> bool {
    AUDIT_PLAN_STATES.contains(&s)
}

// ==================== FSM-5: AuditFinding ====================
const AUDIT_FINDING_STATES: &[&str] = &["open", "in_progress", "verified", "closed"];
const AUDIT_FINDING_TERMINAL: &[&str] = &["closed"];
const AUDIT_FINDING_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("verified", "closed")];

pub fn audit_finding_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("open", "in_progress"),
        ("in_progress", "verified"),
        ("in_progress", "open"),
        ("verified", "closed"),
        ("verified", "in_progress"),
    ];
    check_pair(from, to, allowed_pairs, AUDIT_FINDING_TERMINAL, AUDIT_FINDING_STATES)
}

pub fn audit_finding_requires_approval(from: &str, to: &str) -> bool {
    AUDIT_FINDING_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_audit_finding_status(s: &str) -> bool {
    AUDIT_FINDING_STATES.contains(&s)
}

// ==================== FSM-6: EightDReport ====================
const EIGHT_D_STATES: &[&str] = &[
    "initiated", "in_progress", "containment", "root_cause",
    "permanent_action", "verified", "closed", "cancelled",
];
const EIGHT_D_TERMINAL: &[&str] = &["closed", "cancelled"];
const EIGHT_D_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[
    ("verified", "closed"),
    ("permanent_action", "verified"),
];

pub fn eight_d_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("initiated", "in_progress"),
        ("in_progress", "containment"),
        ("containment", "root_cause"),
        ("root_cause", "permanent_action"),
        ("permanent_action", "verified"),
        ("verified", "closed"),
        ("initiated", "cancelled"),
        ("in_progress", "cancelled"),
        ("containment", "cancelled"),
        ("root_cause", "cancelled"),
        ("permanent_action", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, EIGHT_D_TERMINAL, EIGHT_D_STATES)
}

pub fn eight_d_requires_approval(from: &str, to: &str) -> bool {
    EIGHT_D_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_eight_d_status(s: &str) -> bool {
    EIGHT_D_STATES.contains(&s)
}

// ==================== FSM-7: ApqpProject ====================
const APQP_STATES: &[&str] = &["planning", "in_design", "in_pilot", "in_production", "completed", "cancelled"];
const APQP_TERMINAL: &[&str] = &["completed", "cancelled"];
const APQP_APPROVAL_TRANSITIONS: &[(&str, &str)] = &[
    ("in_pilot", "in_production"),
    ("in_production", "completed"),
];

pub fn apqp_can_transition(from: &str, to: &str) -> Result<(), FsmError> {
    let allowed_pairs: &[(&str, &str)] = &[
        ("planning", "in_design"),
        ("in_design", "in_pilot"),
        ("in_pilot", "in_production"),
        ("in_production", "completed"),
        ("planning", "cancelled"),
        ("in_design", "cancelled"),
        ("in_pilot", "cancelled"),
        ("in_production", "cancelled"),
    ];
    check_pair(from, to, allowed_pairs, APQP_TERMINAL, APQP_STATES)
}

pub fn apqp_requires_approval(from: &str, to: &str) -> bool {
    APQP_APPROVAL_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_apqp_status(s: &str) -> bool {
    APQP_STATES.contains(&s)
}
```

- [ ] **Step 2: 修改 `svc/qms/src/shared/mod.rs` — 追加 fsm 模块声明**

```rust
pub mod permission;
pub mod fsm;

#[cfg(test)]
mod fsm_test;
```

- [ ] **Step 3: 创建 `svc/qms/src/shared/fsm_test.rs`**

为每套 FSM 编写 ≥6 个测试（valid paths、invalid paths、terminal state、unknown status、approval transitions、self-transition rejection）。共 7 × 6 = 42 个测试。

测试模板（以 inspection 为例，其余 6 套按相同模式）：

```rust
use super::fsm::*;
use super::fsm::FsmError;

#[test]
fn test_inspection_valid_transitions() {
    assert!(inspection_can_transition("pending", "in_progress").is_ok());
    assert!(inspection_can_transition("in_progress", "pending_audit").is_ok());
    assert!(inspection_can_transition("pending_audit", "completed").is_ok());
    assert!(inspection_can_transition("pending_audit", "rejected").is_ok());
    assert!(inspection_can_transition("rejected", "in_progress").is_ok());
}

#[test]
fn test_inspection_invalid_transitions() {
    assert!(matches!(
        inspection_can_transition("pending", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inspection_can_transition("pending", "pending_audit"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inspection_can_transition("in_progress", "completed"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

#[test]
fn test_inspection_terminal_state() {
    assert!(matches!(
        inspection_can_transition("completed", "pending"),
        Err(FsmError::TerminalState(_))
    ));
    assert!(matches!(
        inspection_can_transition("completed", "in_progress"),
        Err(FsmError::TerminalState(_))
    ));
}

#[test]
fn test_inspection_unknown_status() {
    assert!(matches!(
        inspection_can_transition("unknown", "pending"),
        Err(FsmError::UnknownStatus(_))
    ));
    assert!(matches!(
        inspection_can_transition("pending", "unknown"),
        Err(FsmError::UnknownStatus(_))
    ));
}

#[test]
fn test_inspection_requires_approval() {
    assert!(inspection_requires_approval("pending_audit", "completed"));
    assert!(inspection_requires_approval("pending_audit", "rejected"));
    assert!(!inspection_requires_approval("pending", "in_progress"));
    assert!(!inspection_requires_approval("in_progress", "pending_audit"));
}

#[test]
fn test_inspection_self_transition_rejected() {
    assert!(matches!(
        inspection_can_transition("pending", "pending"),
        Err(FsmError::InvalidTransition { .. })
    ));
    assert!(matches!(
        inspection_can_transition("in_progress", "in_progress"),
        Err(FsmError::InvalidTransition { .. })
    ));
}

// === issue 6 tests ===
// === action 6 tests ===
// === audit_plan 6 tests ===
// === audit_finding 6 tests ===
// === eight_d 6 tests ===
// === apqp 6 tests ===
```

- [ ] **Step 4: 创建 `apps/web/src/components/qms/StatusBadge.tsx`**

```tsx
import React from 'react';

const STATUS_COLORS: Record<string, string> = {
  // Inspection
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending_audit: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  // Issue
  open: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-red-200 text-red-800',
  // Action
  verified: 'bg-emerald-100 text-emerald-700',
  // Audit
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  // EightD
  initiated: 'bg-purple-100 text-purple-700',
  containment: 'bg-amber-100 text-amber-700',
  root_cause: 'bg-orange-100 text-orange-700',
  permanent_action: 'bg-teal-100 text-teal-700',
  // APQP
  planning: 'bg-cyan-100 text-cyan-700',
  in_design: 'bg-blue-100 text-blue-700',
  in_pilot: 'bg-violet-100 text-violet-700',
  in_production: 'bg-green-100 text-green-700',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label || status}
    </span>
  );
}
```

- [ ] **Step 5: 创建 `apps/web/src/components/qms/FSMActionButtons.tsx`**

```tsx
import React from 'react';

interface FSMAction {
  label: string;
  targetStatus: string;
  requiresApproval?: boolean;
}

const FSM_TRANSITIONS: Record<string, FSMAction[]> = {
  pending: [{ label: '开始检验', targetStatus: 'in_progress' }],
  in_progress: [{ label: '提交审核', targetStatus: 'pending_audit' }],
  pending_audit: [
    { label: '通过', targetStatus: 'completed', requiresApproval: true },
    { label: '驳回', targetStatus: 'rejected', requiresApproval: true },
  ],
  rejected: [{ label: '返工', targetStatus: 'in_progress' }],
};

export function FSMActionButtons({
  currentStatus,
  fsmType,
  onAction,
}: {
  currentStatus: string;
  fsmType: 'inspection' | 'issue' | 'action' | 'audit_plan' | 'audit_finding' | 'eight_d' | 'apqp';
  onAction: (targetStatus: string, requiresApproval: boolean) => void;
}) {
  const transitions = FSM_TRANSITIONS[currentStatus] || [];
  return (
    <div className="flex gap-2">
      {transitions.map((action) => (
        <button
          key={action.targetStatus}
          onClick={() => onAction(action.targetStatus, action.requiresApproval || false)}
          className={`px-3 py-1.5 text-sm rounded-md ${
            action.requiresApproval
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 创建 `apps/web/src/components/qms/__tests__/StatusBadge.test.tsx`**

测试 7 FSM 的状态徽章颜色匹配 + 可达性判断。

- [ ] **Step 7: 运行 cargo test**

Run: `cargo test -p topems-qms --lib fsm_test -- --nocapture 2>&1 | tail -5`
Expected: 42 tests passed

- [ ] **Step 8: 运行 vitest**

Run: `cd apps/web && npx vitest run src/components/qms/__tests__/StatusBadge.test.tsx 2>&1 | tail -5`
Expected: all tests passed

- [ ] **Step 9: Commit**

```bash
git add svc/qms/src/shared/fsm.rs svc/qms/src/shared/fsm_test.rs svc/qms/src/shared/mod.rs apps/web/src/components/qms/
git commit -m "feat(qms): add 7 FSM with 42 unit tests + StatusBadge/FSMActionButtons components"
```

---

## Task 4: 6 BI 分析页 + 6 Detail 页

**目标:** 6 个 BI 深度分析页（质量趋势/缺陷帕累托/成本分析/SPC 控制图/FMEA 风险矩阵/审核合规率）+ 6 个 Detail 页（Inspection/Issue/APQP/8D/FMEA/SPC）。

- [ ] **Step 1: 创建 `apps/web/src/pages/qms/analytics/QmsQualityTrendPage.tsx`**

使用 recharts LineChart 展示质量趋势（合格率 + 问题数双 Y 轴），数据来自 `qmsApi.qualityDashboardApi.getQualityOverview` + 趋势 API。

- [ ] **Step 2: 创建 `apps/web/src/pages/qms/analytics/QmsDefectParetoPage.tsx`**

使用 recharts ComposedChart（Bar + Line）展示缺陷帕累托图，按缺陷类别降序排列 + 累计百分比线。

- [ ] **Step 3: 创建 `apps/web/src/pages/qms/analytics/QmsCostAnalysisPage.tsx`**

使用 recharts PieChart + BarChart 展示质量成本分析（PAF 模型：预防/鉴定/内部故障/外部故障），含成本类别饼图 + 部门成本柱状图 + 趋势折线图。

- [ ] **Step 4: 创建 `apps/web/src/pages/qms/analytics/QmsSpcControlChartPage.tsx`**

使用 recharts LineChart + ReferenceLine 展示 SPC 控制图（UCL/LCL/CL + 数据点 + 超限标红）。

- [ ] **Step 5: 创建 `apps/web/src/pages/qms/analytics/QmsFmeaRiskMatrixPage.tsx`**

使用 recharts ScatterChart 展示 FMEA 风险矩阵（严重度 × 发生度，点大小 = RPN），高/中/低风险区域色块。

- [ ] **Step 6: 创建 `apps/web/src/pages/qms/analytics/QmsAuditCompliancePage.tsx`**

使用 recharts RadialBarChart 展示审核合规率（按部门/审核类型分组的完成率 + 发现项关闭率）。

- [ ] **Step 7: 创建 `apps/web/src/pages/qms/analytics/__tests__/QmsAnalyticsPages.test.tsx`**

测试 6 个 BI 页面的渲染 + recharts 组件存在性 + mock 数据加载。

- [ ] **Step 8: 创建 `apps/web/src/pages/qms/QmsInspectionDetailPage.tsx`**

质检详情页，含 3 Tab：基本信息、检验结果项、审核日志。使用 StatusBadge + FSMActionButtons 组件。

- [ ] **Step 9: 创建 `apps/web/src/pages/qms/QmsIssueDetailPage.tsx`**

质量问题详情页，含 2 Tab：基本信息 + 纠正措施列表。使用 StatusBadge + FSMActionButtons。

- [ ] **Step 10: 创建 `apps/web/src/pages/qms/QmsApqpDetailPage.tsx`**

APQP 详情页，含 4 Tab：阶段进度、任务列表、风险登记、审批记录。使用进度条 + recharts RadarChart 展示阶段进度。

- [ ] **Step 11: 创建 `apps/web/src/pages/qms/QmsEightDDetailPage.tsx`**

8D 报告详情页，含 D1-D8 八步骤 Stepper 组件 + 每步骤内容展示 + 审计日志。

- [ ] **Step 12: 创建 `apps/web/src/pages/qms/QmsFmeaDetailPage.tsx`**

FMEA 详情页，含 FMEA 项子表（可编辑 RPN 计算）+ 风险分布图。

- [ ] **Step 13: 创建 `apps/web/src/pages/qms/QmsSpcChartDetailPage.tsx`**

SPC 控制图详情页，含数据点列表 + 控制限计算 + Cp/Cpk 指标卡。

- [ ] **Step 14: 修改 `apps/web/src/modules/qms/config.ts` — 追加 12 条路由**

在 QMS_PATHS 中追加：
- `qualityTrend: '/qms/analytics/quality-trend'`
- `defectPareto: '/qms/analytics/defect-pareto'`
- `costAnalysis: '/qms/analytics/cost-analysis'`
- `spcControlChart: '/qms/analytics/spc-control-chart'`
- `fmeaRiskMatrix: '/qms/analytics/fmea-risk-matrix'`
- `auditCompliance: '/qms/analytics/audit-compliance'`
- `inspectionDetail: '/qms/inspections/:id'`
- `issueDetail: '/qms/issues/:id'`
- `apqpDetail: '/qms/apqp/:id'`
- `eightDDetail: '/qms/eight-d/:id'`
- `fmeaDetail: '/qms/fmea/:id'`
- `spcChartDetail: '/qms/spc/:id'`

在 routes 数组中追加对应的 lazyWithRetry 路由定义，按 analytics 和 detail 分组。

- [ ] **Step 15: 验证 TypeScript 编译**

Run: `cd apps/web && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -c "error TS"`
Expected: 0 errors

- [ ] **Step 16: 运行 vitest**

Run: `cd apps/web && npx vitest run src/pages/qms/ 2>&1 | tail -5`
Expected: all tests passed

- [ ] **Step 17: Commit**

```bash
git add apps/web/src/pages/qms/ apps/web/src/modules/qms/config.ts
git commit -m "feat(qms): add 6 BI analytics pages + 6 detail pages with recharts visualizations"
```

---

## Task 5: 4 类审批工作流

**目标:** 4 类审批工作流（Inspection/Issue/8D/APQP），每类 3 个端点（approve/reject/rework），共 12 个审批端点。每个端点调用 FSM 校验 + 写入审批状态 + audit 日志。

- [ ] **Step 1: 修改 `svc/qms/src/models/audit_log.rs` — 追加 approval_event 函数**

```rust
/// 记录审批事件到 audit_logs
pub async fn log_approval_event(
    pool: &sqlx::PgPool,
    tenant_id: &str,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    operator: &str,
    status_from: &str,
    status_to: &str,
    comment: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO audit_logs (tenant_id, entity_type, entity_id, action, operator, status_from, status_to, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())"#,
    )
    .bind(tenant_id)
    .bind(entity_type)
    .bind(entity_id)
    .bind(action)
    .bind(operator)
    .bind(status_from)
    .bind(status_to)
    .bind(comment)
    .execute(pool)
    .await?;
    Ok(())
}
```

- [ ] **Step 2: 修改 `svc/qms/src/modules/quality_inspection.rs` — APV-1 审批 3 端点**

追加 3 个审批端点 handler：
- `POST /inspections/{id}/approve` — 调用 `inspection_can_transition(current, "completed")` + `inspection_requires_approval` 校验 + 写入 audit
- `POST /inspections/{id}/reject` — 调用 `inspection_can_transition(current, "rejected")` + 写入 audit
- `POST /inspections/{id}/rework` — 调用 `inspection_can_transition(current, "in_progress")` + 写入 audit

每个端点：
1. 从 DB 读取当前 status
2. 调用 `inspection_can_transition(from, to)` 校验
3. 如果 `inspection_requires_approval(from, to)` 且无审批权限，返回 403
4. UPDATE 状态
5. 调用 `log_approval_event` 记录审计
6. 返回 ApprovalResponse

- [ ] **Step 3: 修改 `svc/qms/src/modules/quality_issue.rs` — APV-2 审批 3 端点**

追加 3 个审批端点：
- `POST /issues/{id}/approve` — resolved → closed（requires_approval）
- `POST /issues/{id}/reject` — resolved → in_progress
- `POST /issues/{id}/cancel` — open/in_progress → cancelled

- [ ] **Step 4: 修改 `svc/qms/src/modules/eight_d.rs` — APV-3 审批 3 端点**

追加 3 个审批端点：
- `POST /eight-d/{id}/approve` — permanent_action → verified（requires_approval）
- `POST /eight-d/{id}/close` — verified → closed（requires_approval）
- `POST /eight-d/{id}/cancel` — 任意非终态 → cancelled

- [ ] **Step 5: 修改 `svc/qms/src/modules/apqp.rs` — APV-4 审批 3 端点**

追加 3 个审批端点：
- `POST /apqp/{id}/approve` — in_pilot → in_production（requires_approval）
- `POST /apqp/{id}/complete` — in_production → completed（requires_approval）
- `POST /apqp/{id}/cancel` — 任意非终态 → cancelled

- [ ] **Step 6: 修改 `svc/qms/src/modules/mod.rs` — 注册 12 个审批路由**

在 `create_routes()` 中追加 12 条审批路由：
```rust
.nest("/api/qms/inspections/{id}/approve", post(quality_inspection::approve_inspection))
.nest("/api/qms/inspections/{id}/reject", post(quality_inspection::reject_inspection))
.nest("/api/qms/inspections/{id}/rework", post(quality_inspection::rework_inspection))
// ... issue 3 endpoints
// ... eight_d 3 endpoints
// ... apqp 3 endpoints
```

- [ ] **Step 7: 创建 `svc/qms/tests/approval_endpoints_test.rs`**

4 类审批 × 2 = 8 单测，测试 FSM 校验逻辑（不需要 DB）：

```rust
use topems_qms::shared::fsm::*;

#[test]
fn test_inspection_approval_flow() {
    // pending_audit → completed requires approval
    assert!(inspection_requires_approval("pending_audit", "completed"));
    assert!(inspection_can_transition("pending_audit", "completed").is_ok());
    // pending_audit → rejected requires approval
    assert!(inspection_requires_approval("pending_audit", "rejected"));
    assert!(inspection_can_transition("pending_audit", "rejected").is_ok());
}

#[test]
fn test_inspection_rework_no_approval() {
    // rejected → in_progress does NOT require approval
    assert!(!inspection_requires_approval("rejected", "in_progress"));
    assert!(inspection_can_transition("rejected", "in_progress").is_ok());
}

#[test]
fn test_issue_approval_flow() {
    assert!(issue_requires_approval("resolved", "closed"));
    assert!(issue_can_transition("resolved", "closed").is_ok());
}

#[test]
fn test_issue_cancel_no_approval() {
    assert!(!issue_requires_approval("open", "cancelled"));
    assert!(issue_can_transition("open", "cancelled").is_ok());
}

#[test]
fn test_eight_d_approval_flow() {
    assert!(eight_d_requires_approval("permanent_action", "verified"));
    assert!(eight_d_can_transition("permanent_action", "verified").is_ok());
}

#[test]
fn test_eight_d_close_approval() {
    assert!(eight_d_requires_approval("verified", "closed"));
    assert!(eight_d_can_transition("verified", "closed").is_ok());
}

#[test]
fn test_apqp_approval_flow() {
    assert!(apqp_requires_approval("in_pilot", "in_production"));
    assert!(apqp_can_transition("in_pilot", "in_production").is_ok());
}

#[test]
fn test_apqp_cancel_no_approval() {
    assert!(!apqp_requires_approval("planning", "cancelled"));
    assert!(apqp_can_transition("planning", "cancelled").is_ok());
}
```

- [ ] **Step 8: 运行 cargo test**

Run: `cargo test -p topems-qms --test approval_endpoints_test -- --nocapture 2>&1 | tail -5`
Expected: 8 tests passed

- [ ] **Step 9: 验证 cargo check**

Run: `cargo check -p topems-qms 2>&1 | grep -E "^error" | wc -l`
Expected: 0 errors

- [ ] **Step 10: Commit**

```bash
git add svc/qms/src/models/audit_log.rs svc/qms/src/modules/ svc/qms/tests/approval_endpoints_test.rs
git commit -m "feat(qms): add 12 approval endpoints for 4 entity types with FSM validation + audit logging"
```

---

## Task 6: 五重验收

**目标:** TypeScript 型检 0 错误 + Rust 严格模式 0 错误 + 导航三重校验 1:1 + vitest ≥80% + cargo test ≥50 用例；TODO.md 追加 V198-V204 验收报告。

- [ ] **Step 1: TypeScript 型检**

Run: `cd apps/web && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -c "error TS"`
Expected: 0

- [ ] **Step 2: Rust 严格模式编译**

Run: `cargo check -p topems-qms 2>&1 | grep -E "^error" | wc -l`
Expected: 0

Run: `cargo clippy -p topems-qms -- -D warnings 2>&1 | grep -E "^error" | wc -l`
Expected: 0

- [ ] **Step 3: 导航三重校验**

创建 `scripts/dev/check-qms-nav.mjs`，校验 QMS_PATHS × routes × navItems 1:1 对齐。

Run: `node scripts/dev/check-qms-nav.mjs`
Expected: PASS (all paths in routes × nav match)

- [ ] **Step 4: vitest 覆盖率**

Run: `cd apps/web && npx vitest run --coverage src/pages/qms src/components/qms src/api/__tests__/qms-api.test.ts 2>&1 | tail -10`
Expected: coverage ≥80%

- [ ] **Step 5: cargo test**

Run: `cargo test -p topems-qms --lib 2>&1 | tail -5`
Expected: ≥50 tests passed (42 FSM + 8 approval + existing unit tests)

- [ ] **Step 6: 创建 `apps/web/src/api/__tests__/qms-contract.test.ts`**

前端契约一致性测试，校验 types/qms.ts 的字段与 API client 返回类型一致。

- [ ] **Step 7: 修改 `docs/roadmap/TODO.md` — 追加 V198-V204 验收章节**

追加 QMS 模块全量业务逻辑落地验收报告，包含交付物统计、任务执行明细和关键修复。

- [ ] **Step 8: Commit**

```bash
git add scripts/dev/check-qms-nav.mjs apps/web/src/api/__tests__/qms-contract.test.ts docs/roadmap/TODO.md
git commit -m "feat(qms): 5-verify green (TS 0 error / Rust 0 error / nav 1:1 / vitest ≥80% / cargo test ≥50)"
```
