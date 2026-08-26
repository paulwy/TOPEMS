/**
 * QMS Mock 数据生成器
 *
 * 参考 apps/web/src/api/crm/_mock.ts 的模式，提供：
 * - useQmsMock hook（受 VITE_ENABLE_QMS_MOCK / __TOPEMS_DEMO__ 控制）
 * - 10 实体的 mock 数据生成函数
 * - QualityOverview / QualityTrendItem / DefectDistribution 的 mock 数据
 *
 * 启用方式：
 *   - 环境变量 VITE_ENABLE_QMS_MOCK=true
 *   - 或 window.__TOPEMS_DEMO__ = true
 *   - 且未设置 VITE_QMS_DISABLE_MOCK=true
 */

import type {
  QualityStandard,
  QualityCheck,
  QualityIssue,
  QualityImprovement,
  AuditPlan,
  AuditTask,
  AuditFinding,
  SpcChart,
  SpcDataPoint,
  QualityCost,
  EightDReport,
  FmeaAnalysis,
  FmeaItem,
  ApqpProject,
  ApqpPhase,
  ApqpTask,
  ApqpRisk,
  ApqpApproval,
  QualityOverview,
  QualityTrendItem,
  DefectDistribution,
} from './types';
import i18n from '@/i18n';

// ============================================================================
// Seeded RNG (mulberry32) — 与 crm/_mock.ts 保持一致
// ============================================================================
function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function int(rnd: () => number, min: number, max: number): number {
  return Math.floor(min + rnd() * (max - min + 1));
}

function isoDate(rnd: () => number, daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(int(rnd, 0, 23), int(rnd, 0, 59), int(rnd, 0, 59));
  return d.toISOString();
}

function isoFutureDate(rnd: () => number, daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(int(rnd, 0, 23), int(rnd, 0, 59), int(rnd, 0, 59));
  return d.toISOString();
}

function uuid(rnd: () => number, prefix: string): string {
  const hex = '0123456789abcdef';
  let s = prefix;
  for (let i = 0; i < 8; i++) s += hex[Math.floor(rnd() * 16)];
  return s;
}

// ============================================================================
// 静态选项池
// ============================================================================
function getStandardCategories() {
  return [
    i18n.t('shared._mock.k3'),
    i18n.t('shared._mock.k2'),
    i18n.t('shared._mock.k1'),
    i18n.t('shared._mock.k0'),
  ] as const;
}
const STANDARD_STATUSES = ['active', 'draft', 'inactive'] as const;
const INSPECTION_TYPES = ['incoming', 'in_process', 'final', 'shipment'] as const;
const INSPECTION_STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'audited'] as const;
const ISSUE_SEVERITIES = ['critical', 'major', 'minor', 'low'] as const;
const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const ACTION_STATUSES = ['pending', 'in_progress', 'implemented', 'verified', 'closed'] as const;
const AUDIT_TYPES = ['internal', 'external', 'supplier', 'process', 'system'] as const;
const AUDIT_PLAN_STATUSES = ['draft', 'planned', 'in_progress', 'completed', 'cancelled'] as const;
const AUDIT_FINDING_SEVERITIES = ['critical', 'major', 'minor', 'observation'] as const;
const SPC_CHART_TYPES = ['xbar_r', 'xbar_s', 'p', 'np', 'c', 'u'] as const;
const COST_TYPES = ['prevention', 'appraisal', 'internal_failure', 'external_failure'] as const;
function getCostCategories() {
  return [
    i18n.t('shared._mock.k8'),
    i18n.t('shared._mock.k7'),
    i18n.t('shared._mock.k6'),
    i18n.t('shared._mock.k5'),
    i18n.t('shared._mock.k4'),
  ] as const;
}
const EIGHTD_SEVERITIES = ['critical', 'major', 'minor'] as const;
const EIGHTD_STATUSES = [
  'draft',
  'd1_team',
  'd3_containment',
  'd4_root_cause',
  'd5_permanent',
  'closed',
] as const;
const FMEA_TYPES = ['design', 'process', 'system', 'service'] as const;
const FMEA_STATUSES = ['draft', 'in_review', 'approved', 'obsolete'] as const;
const APQP_STATUSES = [
  'concept',
  'planning',
  'product_design',
  'process_design',
  'product_validation',
  'production',
  'closure',
] as const;
function getApqpPhases() {
  return [
    { code: 'P1', name: i18n.t('shared._mock.k9') },
    { code: 'P2', name: i18n.t('shared._mock.k10') },
    { code: 'P3', name: i18n.t('shared._mock.k11') },
    { code: 'P4', name: i18n.t('shared._mock.k12') },
    { code: 'P5', name: i18n.t('shared._mock.k13') },
  ] as const;
}
function getRiskCategories() {
  return [
    i18n.t('shared._mock.k18'),
    i18n.t('shared._mock.k17'),
    i18n.t('shared._mock.k16'),
    i18n.t('shared._mock.k15'),
    i18n.t('shared._mock.k14'),
  ] as const;
}
function getDepartments() {
  return [
    i18n.t('shared._mock.k24'),
    i18n.t('shared._mock.k23'),
    i18n.t('shared._mock.k22'),
    i18n.t('shared._mock.k21'),
    i18n.t('shared._mock.k20'),
    i18n.t('shared._mock.k19'),
  ] as const;
}
function getProducts() {
  return [
    i18n.t('shared._mock.a_29'),
    i18n.t('shared._mock.b_28'),
    i18n.t('shared._mock.c_27'),
    i18n.t('shared._mock.d_26'),
    i18n.t('shared._mock.e_25'),
  ] as const;
}
function getCustomers() {
  return [
    i18n.t('shared._mock.k34'),
    i18n.t('shared._mock.k33'),
    i18n.t('shared._mock.k32'),
    i18n.t('shared._mock.k31'),
    i18n.t('shared._mock.k30'),
  ] as const;
}
function getAuditors() {
  return [
    i18n.t('shared._mock.k39'),
    i18n.t('shared._mock.k38'),
    i18n.t('shared._mock.k37'),
    i18n.t('shared._mock.k36'),
    i18n.t('shared._mock.k35'),
  ] as const;
}

// ============================================================================
// 10 实体 mock 数据生成函数
// ============================================================================

// E-1 QualityStandard
function buildStandards(rnd: () => number, count: number): QualityStandard[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 365));
    return {
      id: uuid(rnd, 'std-'),
      name: `${pick(rnd, getStandardCategories())}${i18n.t('shared._mock.k0')}${String(i + 1).padStart(3, '0')}`,
      code: `QS-${String(i + 1).padStart(4, '0')}`,
      category: pick(rnd, getStandardCategories()),
      version: `v${int(rnd, 1, 3)}.${int(rnd, 0, 9)}`,
      description: `${pick(rnd, getStandardCategories())}${i18n.t('shared._mock.k1')}`,
      content: `${i18n.t('shared._mock.k2')}${pick(rnd, getProducts())}${i18n.t('shared._mock.k3')}`,
      status: pick(rnd, STANDARD_STATUSES),
      effective_date: createdAt,
      expiry_date: rnd() > 0.5 ? isoFutureDate(rnd, int(rnd, 30, 365)) : undefined,
      created_at: createdAt,
      updated_at: isoDate(rnd, int(rnd, 0, 30)),
    };
  });
}

// E-2 QualityInspection (QualityCheck)
function buildInspections(rnd: () => number, count: number): QualityCheck[] {
  return Array.from({ length: count }, (_, i) => {
    const quantity = int(rnd, 50, 500);
    const qualified = int(rnd, Math.floor(quantity * 0.8), quantity);
    const unqualified = quantity - qualified;
    return {
      id: uuid(rnd, 'ins-'),
      inspection_no: `INS-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      inspection_type: pick(rnd, INSPECTION_TYPES),
      product_name: pick(rnd, getProducts()),
      standard_id: uuid(rnd, 'std-'),
      quantity,
      qualified_quantity: qualified,
      unqualified_quantity: unqualified,
      qualification_rate: Math.round((qualified / quantity) * 1000) / 10,
      status: pick(rnd, INSPECTION_STATUSES),
      inspector: pick(rnd, getAuditors()),
      assignee: pick(rnd, getAuditors()),
      inspected_at: isoDate(rnd, int(rnd, 0, 30)),
      result: pick(rnd, ['pass', 'conditional_pass', 'fail']),
      memo: rnd() > 0.7 ? i18n.t('shared._mock.k40') : undefined,
      created_by: pick(rnd, getAuditors()),
      created_at: isoDate(rnd, int(rnd, 1, 30)),
      updated_at: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

// E-3 QualityIssue
function buildIssues(rnd: () => number, count: number): QualityIssue[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 90));
    return {
      id: uuid(rnd, 'iss-'),
      issue_no: `QI-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      title: `${pick(rnd, getProducts())}${pick(rnd, [i18n.t('shared._mock.k44'), i18n.t('shared._mock.k43'), i18n.t('shared._mock.k42'), i18n.t('shared._mock.k41')])}`,
      description: `${i18n.t('shared._mock.k4')}${pick(rnd, getStandardCategories())}${i18n.t('shared._mock.k5')}${pick(rnd, [i18n.t('shared._mock.k47'), i18n.t('shared._mock.k46'), i18n.t('shared._mock.k45')])}${i18n.t('shared._mock.k6')}`,
      severity: pick(rnd, ISSUE_SEVERITIES),
      category: pick(rnd, getStandardCategories()),
      status: pick(rnd, ISSUE_STATUSES),
      assignee: pick(rnd, getAuditors()),
      due_date: isoFutureDate(rnd, int(rnd, 7, 30)),
      resolution: rnd() > 0.5 ? i18n.t('shared._mock.k48') : undefined,
      closed_at: rnd() > 0.6 ? isoDate(rnd, int(rnd, 0, 10)) : undefined,
      created_at: createdAt,
      updated_at: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

// E-4 CorrectiveAction (QualityImprovement)
function buildImprovements(rnd: () => number, count: number): QualityImprovement[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 60));
    return {
      id: uuid(rnd, 'ca-'),
      improvement_no: `CA-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      title: `${pick(rnd, [i18n.t('shared._mock.k54'), i18n.t('shared._mock.k53'), i18n.t('shared._mock.k52')])}${pick(rnd, [i18n.t('shared._mock.k51'), i18n.t('shared._mock.k50'), i18n.t('shared._mock.k49')])}`,
      description: `${i18n.t('shared._mock.k7')}${pick(rnd, getProducts())}${i18n.t('shared._mock.k8')}`,
      category: pick(rnd, getStandardCategories()),
      status: pick(rnd, ACTION_STATUSES),
      proposer: pick(rnd, getAuditors()),
      assignee: pick(rnd, getAuditors()),
      improvement_effect: rnd() > 0.5 ? i18n.t('shared._mock.32_9') : undefined,
      created_at: createdAt,
      updated_at: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

// E-5 AuditPlan + AuditTask + AuditFinding
function buildAuditPlans(rnd: () => number, count: number): AuditPlan[] {
  return Array.from({ length: count }, (_, i) => {
    const startDate = isoFutureDate(rnd, int(rnd, 1, 30));
    return {
      id: uuid(rnd, 'ap-'),
      plan_no: `AP-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      title: `${pick(rnd, AUDIT_TYPES)}${i18n.t('shared._mock.k10')}${String(i + 1).padStart(2, '0')}`,
      description: `${i18n.t('shared._mock.k11')}${pick(rnd, getDepartments())}${i18n.t('shared._mock.k12')}${pick(rnd, AUDIT_TYPES)}${i18n.t('shared._mock.k13')}`,
      audit_type: pick(rnd, AUDIT_TYPES),
      status: pick(rnd, AUDIT_PLAN_STATUSES),
      auditor: pick(rnd, getAuditors()),
      auditors: Array.from({ length: int(rnd, 2, 4) }, () => pick(rnd, getAuditors())),
      start_date: startDate,
      end_date: isoFutureDate(rnd, int(rnd, 31, 60)),
      departments: Array.from({ length: int(rnd, 1, 3) }, () => pick(rnd, getDepartments())),
      planned_date: startDate,
      scope: pick(rnd, [
        i18n.t('shared._mock.k57'),
        i18n.t('shared._mock.k56'),
        i18n.t('shared._mock.k55'),
      ]),
      created_at: isoDate(rnd, int(rnd, 1, 30)),
      updated_at: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

function buildAuditTasks(rnd: () => number, plans: AuditPlan[]): AuditTask[] {
  const tasks: AuditTask[] = [];
  plans.forEach((plan, pi) => {
    const taskCount = int(rnd, 2, 5);
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        id: uuid(rnd, 'at-'),
        plan_id: plan.id,
        task_no: `AT-${pi + 1}-${String(i + 1).padStart(2, '0')}`,
        title: `${pick(rnd, getDepartments())}${i18n.t('shared._mock.k14')}${i + 1}`,
        description: `${i18n.t('shared._mock.k15')}${pick(rnd, getDepartments())}${i18n.t('shared._mock.k16')}${pick(rnd, [i18n.t('shared._mock.k60'), i18n.t('shared._mock.k59'), i18n.t('shared._mock.k58')])}`,
        status: pick(rnd, ['pending', 'in_progress', 'completed']),
        assigned_to: pick(rnd, getAuditors()),
        assignee: pick(rnd, getAuditors()),
        priority: pick(rnd, ['high', 'medium', 'low']),
        due_date: isoFutureDate(rnd, int(rnd, 7, 30)),
        completed_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 5)) : undefined,
        findings_count: int(rnd, 0, 5),
        created_at: isoDate(rnd, int(rnd, 1, 20)),
        updated_at: isoDate(rnd, int(rnd, 0, 5)),
      });
    }
  });
  return tasks;
}

function buildAuditFindings(rnd: () => number, tasks: AuditTask[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  tasks.forEach((task, ti) => {
    const findingCount = task.findings_count;
    for (let i = 0; i < findingCount; i++) {
      findings.push({
        id: uuid(rnd, 'af-'),
        task_id: task.id,
        finding_no: `AF-${ti + 1}-${String(i + 1).padStart(2, '0')}`,
        title: `${pick(rnd, [i18n.t('shared._mock.k64'), i18n.t('shared._mock.k63'), i18n.t('shared._mock.k62'), i18n.t('shared._mock.k61')])}${i18n.t('shared._mock.k17')}`,
        description: `${i18n.t('shared._mock.k18')}${pick(rnd, getDepartments())}${i18n.t('shared._mock.k19')}${pick(rnd, [i18n.t('shared._mock.k67'), i18n.t('shared._mock.k66'), i18n.t('shared._mock.k65')])}${i18n.t('shared._mock.k20')}`,
        severity: pick(rnd, AUDIT_FINDING_SEVERITIES),
        category: pick(rnd, [
          i18n.t('shared._mock.k71'),
          i18n.t('shared._mock.k70'),
          i18n.t('shared._mock.k69'),
          i18n.t('shared._mock.k68'),
        ]),
        status: pick(rnd, ['open', 'in_review', 'confirmed', 'rectified', 'verified']),
        recommendation: `${i18n.t('shared._mock.k21')}${pick(rnd, [i18n.t('shared._mock.k75'), i18n.t('shared._mock.k74'), i18n.t('shared._mock.k73'), i18n.t('shared._mock.k72')])}`,
        assigned_to: pick(rnd, getAuditors()),
        due_date: isoFutureDate(rnd, int(rnd, 7, 30)),
        resolved_at: rnd() > 0.6 ? isoDate(rnd, int(rnd, 0, 5)) : undefined,
        created_at: isoDate(rnd, int(rnd, 1, 15)),
        updated_at: isoDate(rnd, int(rnd, 0, 5)),
      });
    }
  });
  return findings;
}

// E-6 SpcChart + SpcDataPoint
function buildSpcCharts(rnd: () => number, count: number): SpcChart[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 180));
    return {
      id: uuid(rnd, 'spc-'),
      chartNo: `SPC-${String(i + 1).padStart(4, '0')}`,
      chartName: `${pick(rnd, getProducts())}${i18n.t('shared._mock.k22')}${i + 1}`,
      chartType: pick(rnd, SPC_CHART_TYPES),
      productName: pick(rnd, getProducts()),
      processName: pick(rnd, [
        i18n.t('shared._mock.k80'),
        i18n.t('shared._mock.k79'),
        i18n.t('shared._mock.k78'),
        i18n.t('shared._mock.k77'),
        i18n.t('shared._mock.k76'),
      ]),
      characteristic: pick(rnd, [
        i18n.t('shared._mock.k85'),
        i18n.t('shared._mock.k84'),
        i18n.t('shared._mock.k83'),
        i18n.t('shared._mock.k82'),
        i18n.t('shared._mock.k81'),
      ]),
      unit: pick(rnd, ['mm', 'μm', '°C', 'N', 'Hz']),
      usl: int(rnd, 100, 110),
      lsl: int(rnd, 90, 100),
      target: int(rnd, 99, 101),
      ucl: int(rnd, 102, 106),
      lcl: int(rnd, 94, 98),
      cl: int(rnd, 99, 101),
      sampleSize: pick(rnd, [4, 5, 6, 8]),
      samplingFrequency: pick(rnd, [
        i18n.t('shared._mock.k89'),
        i18n.t('shared._mock.2_88'),
        i18n.t('shared._mock.k87'),
        i18n.t('shared._mock.k86'),
      ]),
      status: pick(rnd, ['active', 'inactive']),
      description: `${pick(rnd, getProducts())}${i18n.t('shared._mock.k23')}`,
      createdBy: pick(rnd, getAuditors()),
      createdAt,
      updatedAt: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildSpcDataPoints(rnd: () => number, charts: SpcChart[]): SpcDataPoint[] {
  const points: SpcDataPoint[] = [];
  charts.forEach((chart) => {
    const count = int(rnd, 10, 25);
    for (let i = 0; i < count; i++) {
      const values = Array.from(
        { length: chart.sampleSize },
        () => Math.round(((chart.cl ?? 100) + (rnd() - 0.5) * 4) * 100) / 100
      );
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const range = Math.max(...values) - Math.min(...values);
      const isOOC = mean > (chart.ucl ?? Infinity) || mean < (chart.lcl ?? -Infinity);
      points.push({
        id: uuid(rnd, 'sdp-'),
        chartId: chart.id,
        sampleNo: `S${String(i + 1).padStart(3, '0')}`,
        sampleTime: isoDate(rnd, int(rnd, 0, 7)),
        values,
        mean: Math.round(mean * 100) / 100,
        range: Math.round(range * 100) / 100,
        stdDev:
          Math.round(
            Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) * 100
          ) / 100,
        isOutOfControl: isOOC,
        violationRules: isOOC ? [pick(rnd, ['rule1', 'rule2', 'rule3'])] : undefined,
        operator: pick(rnd, getAuditors()),
        remark: isOOC ? i18n.t('shared._mock.k90') : undefined,
        createdAt: isoDate(rnd, int(rnd, 0, 7)),
      });
    }
  });
  return points;
}

// E-7 QualityCost
function buildQualityCosts(rnd: () => number, count: number): QualityCost[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 90));
    return {
      id: uuid(rnd, 'qc-'),
      costNo: `QC-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      costType: pick(rnd, COST_TYPES),
      costCategory: pick(rnd, getCostCategories()),
      amount: int(rnd, 5000, 200000),
      currency: 'CNY',
      occurrenceDate: createdAt,
      department: pick(rnd, getDepartments()),
      relatedOrderNo: rnd() > 0.5 ? `PO-${int(rnd, 1000, 9999)}` : undefined,
      description: `${pick(rnd, COST_TYPES)}${i18n.t('shared._mock.k24')}`,
      responsiblePerson: pick(rnd, getAuditors()),
      status: pick(rnd, ['confirmed', 'pending', 'rejected']),
      createdBy: pick(rnd, getAuditors()),
      createdAt,
      updatedAt: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

// E-8 EightDReport
function buildEightDReports(rnd: () => number, count: number): EightDReport[] {
  return Array.from({ length: count }, (_, i) => {
    const stage = int(rnd, 1, 8);
    const createdAt = isoDate(rnd, int(rnd, 1, 120));
    return {
      id: uuid(rnd, '8d-'),
      reportNo: `8D-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      title: `${pick(rnd, getProducts())}${pick(rnd, [i18n.t('shared._mock.k93'), i18n.t('shared._mock.k92'), i18n.t('shared._mock.k91')])}${i18n.t('shared._mock.8d_25')}`,
      problemDescription: `${i18n.t('shared._mock.k26')}${pick(rnd, getProducts())}${i18n.t('shared._mock.k27')}${pick(rnd, [i18n.t('shared._mock.k96'), i18n.t('shared._mock.k95'), i18n.t('shared._mock.k94')])}${i18n.t('shared._mock.k28')}`,
      severity: pick(rnd, EIGHTD_SEVERITIES),
      source: pick(rnd, ['customer_complaint', 'internal_audit', 'process_deviation']),
      productId: uuid(rnd, 'prod-'),
      productName: pick(rnd, getProducts()),
      customer: pick(rnd, getCustomers()),
      status: pick(rnd, EIGHTD_STATUSES),
      currentStage: stage,
      teamLeader: pick(rnd, getAuditors()),
      teamMembers: Array.from({ length: int(rnd, 3, 6) }, () => pick(rnd, getAuditors())),
      d1TeamEstablished: stage >= 1,
      d2ProblemDescribed: stage >= 2,
      d3ContainmentImplemented: stage >= 3,
      d4RootCauseIdentified: stage >= 4,
      d5PermanentActionSelected: stage >= 5,
      d6ActionVerified: stage >= 6,
      d7PreventiveImplemented: stage >= 7,
      d8TeamRecognized: stage >= 8,
      d1Content:
        stage >= 1
          ? `${i18n.t('shared._mock.k29')}${pick(rnd, getAuditors())}${i18n.t('shared._mock.k30')}${int(rnd, 3, 6)}${i18n.t('shared._mock.k31')}`
          : undefined,
      d2Content:
        stage >= 2
          ? `${i18n.t('shared._mock.k32')}${pick(rnd, getProducts())}${i18n.t('shared._mock.k33')}${pick(rnd, getStandardCategories())}${i18n.t('shared._mock.k34')}`
          : undefined,
      d3Content: stage >= 3 ? i18n.t('api._mock.k0') : undefined,
      d4Content:
        stage >= 4
          ? `${i18n.t('shared._mock.k35')}${pick(rnd, [i18n.t('shared._mock.k99'), i18n.t('shared._mock.k98'), i18n.t('shared._mock.k97')])}`
          : undefined,
      d5Content:
        stage >= 5
          ? `${i18n.t('shared._mock.k36')}${pick(rnd, [i18n.t('shared._mock.k102'), i18n.t('shared._mock.k101'), i18n.t('shared._mock.k100')])}`
          : undefined,
      d6Content: stage >= 6 ? i18n.t('api._mock.k1') : undefined,
      d7Content: stage >= 7 ? i18n.t('shared._mock.fmea_37') : undefined,
      d8Content: stage >= 8 ? i18n.t('api._mock.k2') : undefined,
      dueDate: isoFutureDate(rnd, int(rnd, 7, 30)),
      closedAt: stage >= 8 ? isoDate(rnd, int(rnd, 0, 5)) : undefined,
      createdBy: pick(rnd, getAuditors()),
      createdAt,
      updatedAt: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

// E-9 FmeaAnalysis + FmeaItem
function buildFmeaAnalyses(rnd: () => number, count: number): FmeaAnalysis[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 180));
    return {
      id: uuid(rnd, 'fmea-'),
      fmeaNo: `FMEA-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      fmeaName: `${pick(rnd, getProducts())}${pick(rnd, FMEA_TYPES)}FMEA`,
      fmeaType: pick(rnd, FMEA_TYPES),
      productName: pick(rnd, getProducts()),
      processName: pick(rnd, [
        i18n.t('shared._mock.k106'),
        i18n.t('shared._mock.k105'),
        i18n.t('shared._mock.k104'),
        i18n.t('shared._mock.k103'),
      ]),
      version: `v${int(rnd, 1, 3)}.${int(rnd, 0, 9)}`,
      status: pick(rnd, FMEA_STATUSES),
      scope: pick(rnd, [
        i18n.t('shared._mock.k109'),
        i18n.t('shared._mock.k108'),
        i18n.t('shared._mock.k107'),
      ]),
      teamLeader: pick(rnd, getAuditors()),
      teamMembers: Array.from({ length: int(rnd, 3, 5) }, () => pick(rnd, getAuditors())),
      description: `${pick(rnd, getProducts())}${i18n.t('shared._mock.k38')}${pick(rnd, FMEA_TYPES)}${i18n.t('shared._mock.k39')}`,
      createdBy: pick(rnd, getAuditors()),
      createdAt,
      updatedAt: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildFmeaItems(rnd: () => number, analyses: FmeaAnalysis[]): FmeaItem[] {
  const items: FmeaItem[] = [];
  analyses.forEach((fa, ai) => {
    const itemCount = int(rnd, 3, 8);
    for (let i = 0; i < itemCount; i++) {
      const severity = int(rnd, 4, 10);
      const occurrence = int(rnd, 2, 8);
      const detection = int(rnd, 2, 9);
      items.push({
        id: uuid(rnd, 'fi-'),
        fmeaId: fa.id,
        itemNo: `FI-${ai + 1}-${String(i + 1).padStart(2, '0')}`,
        functionDescription: `${pick(rnd, [i18n.t('shared._mock.k113'), i18n.t('shared._mock.k112'), i18n.t('shared._mock.k111'), i18n.t('shared._mock.k110')])}`,
        failureMode: pick(rnd, [
          i18n.t('shared._mock.k118'),
          i18n.t('shared._mock.k117'),
          i18n.t('shared._mock.k116'),
          i18n.t('shared._mock.k115'),
          i18n.t('shared._mock.k114'),
        ]),
        failureEffect: pick(rnd, [
          i18n.t('shared._mock.k122'),
          i18n.t('shared._mock.k121'),
          i18n.t('shared._mock.k120'),
          i18n.t('shared._mock.k119'),
        ]),
        severity,
        failureCause: pick(rnd, [
          i18n.t('shared._mock.k126'),
          i18n.t('shared._mock.k125'),
          i18n.t('shared._mock.k124'),
          i18n.t('shared._mock.k123'),
        ]),
        occurrence,
        currentControls: pick(rnd, [
          i18n.t('shared._mock.k129'),
          i18n.t('shared._mock.k128'),
          i18n.t('shared._mock.spc_40'),
          i18n.t('shared._mock.k127'),
        ]),
        detection,
        rpn: severity * occurrence * detection,
        recommendedActions: pick(rnd, [
          i18n.t('shared._mock.k132'),
          i18n.t('shared._mock.k131'),
          i18n.t('shared._mock.k130'),
        ]),
        responsibility: pick(rnd, getAuditors()),
        targetDate: isoFutureDate(rnd, int(rnd, 14, 60)),
        actionsTaken: rnd() > 0.5 ? i18n.t('shared._mock.k133') : undefined,
        severityRevised: rnd() > 0.5 ? int(rnd, 3, 7) : undefined,
        occurrenceRevised: rnd() > 0.5 ? int(rnd, 1, 5) : undefined,
        detectionRevised: rnd() > 0.5 ? int(rnd, 1, 6) : undefined,
        rpnRevised: rnd() > 0.5 ? int(rnd, 20, 150) : undefined,
        status: pick(rnd, ['open', 'in_progress', 'completed']),
        createdAt: fa.createdAt,
        updatedAt: isoDate(rnd, int(rnd, 0, 10)),
      });
    }
  });
  return items;
}

// E-10 ApqpProject + ApqpPhase + ApqpTask + ApqpRisk + ApqpApproval
function buildApqpProjects(rnd: () => number, count: number): ApqpProject[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 365));
    const progress = int(rnd, 0, 100);
    return {
      id: uuid(rnd, 'apqp-'),
      project_no: `APQP-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      project_name: `${pick(rnd, getProducts())}${i18n.t('shared._mock.apqp_41')}`,
      product_id: uuid(rnd, 'prod-'),
      product_name: pick(rnd, getProducts()),
      customer: pick(rnd, getCustomers()),
      description: `${pick(rnd, getCustomers())}${i18n.t('shared._mock.k42')}${pick(rnd, getProducts())}${i18n.t('shared._mock.k43')}`,
      status: pick(rnd, APQP_STATUSES),
      current_phase: pick(rnd, getApqpPhases()).code,
      leader: pick(rnd, getAuditors()),
      team: Array.from({ length: int(rnd, 3, 6) }, () => pick(rnd, getAuditors())).join(','),
      start_date: createdAt,
      target_date: isoFutureDate(rnd, int(rnd, 30, 365)),
      actualEndDate: progress >= 100 ? isoDate(rnd, int(rnd, 0, 10)) : undefined,
      progress,
      risklevel: pick(rnd, ['low', 'medium', 'high']),
      created_by: pick(rnd, getAuditors()),
      created_at: createdAt,
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildApqpPhases(rnd: () => number, projects: ApqpProject[]): ApqpPhase[] {
  const phases: ApqpPhase[] = [];
  projects.forEach((proj, _pi) => {
    getApqpPhases().forEach((phaseDef, i) => {
      const phaseProgress =
        (proj.progress ?? 0) >= (i + 1) * 20 ? 100 : Math.max(0, (proj.progress ?? 0) - i * 20);
      phases.push({
        id: uuid(rnd, 'aph-'),
        project_id: proj.id,
        phase_code: phaseDef.code,
        phase_name: phaseDef.name,
        description: `${phaseDef.name}${i18n.t('shared._mock.k44')}`,
        status: phaseProgress >= 100 ? 'completed' : phaseProgress > 0 ? 'in_progress' : 'pending',
        start_date: i === 0 ? proj.start_date : undefined,
        end_date: phaseProgress >= 100 ? isoDate(rnd, int(rnd, 0, 30)) : undefined,
        actualStartDate:
          i === 0 ? proj.start_date : phaseProgress > 0 ? isoDate(rnd, int(rnd, 0, 60)) : undefined,
        actualEndDate: phaseProgress >= 100 ? isoDate(rnd, int(rnd, 0, 20)) : undefined,
        progress: phaseProgress,
        sort_order: i + 1,
        created_at: proj.created_at,
        updated_at: isoDate(rnd, int(rnd, 0, 10)),
      });
    });
  });
  return phases;
}

function buildApqpTasks(
  rnd: () => number,
  projects: ApqpProject[],
  phases: ApqpPhase[]
): ApqpTask[] {
  const tasks: ApqpTask[] = [];
  projects.forEach((proj) => {
    const projectPhases = phases.filter((p) => p.project_id === proj.id);
    projectPhases.forEach((phase, pi) => {
      const taskCount = int(rnd, 2, 4);
      for (let i = 0; i < taskCount; i++) {
        tasks.push({
          id: uuid(rnd, 'apt-'),
          project_id: proj.id,
          phase_id: phase.id,
          task_name: `${phase.phase_name}${i18n.t('shared._mock.k45')}${i + 1}`,
          description: pick(rnd, [
            i18n.t('shared._mock.k138'),
            i18n.t('shared._mock.k137'),
            i18n.t('shared._mock.k136'),
            i18n.t('shared._mock.k135'),
            i18n.t('shared._mock.k134'),
          ]),
          task_type: pick(rnd, ['analysis', 'design', 'validation', 'documentation']),
          deliverable: pick(rnd, [
            i18n.t('shared._mock.k143'),
            i18n.t('shared._mock.k142'),
            i18n.t('shared._mock.k141'),
            i18n.t('shared._mock.k140'),
            i18n.t('shared._mock.k139'),
          ]),
          status: pick(rnd, ['pending', 'in_progress', 'completed']),
          assignee: pick(rnd, getAuditors()),
          due_date: isoFutureDate(rnd, int(rnd, 7, 60)),
          completed_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 10)) : undefined,
          sort_order: pi * 10 + i + 1,
          created_at: proj.created_at,
          updated_at: isoDate(rnd, int(rnd, 0, 10)),
        });
      }
    });
  });
  return tasks;
}

function buildApqpRisks(rnd: () => number, projects: ApqpProject[]): ApqpRisk[] {
  const risks: ApqpRisk[] = [];
  projects.forEach((proj) => {
    const riskCount = int(rnd, 2, 5);
    for (let i = 0; i < riskCount; i++) {
      const severity = int(rnd, 4, 10);
      const occurrence = int(rnd, 2, 7);
      const detection = int(rnd, 2, 8);
      risks.push({
        id: uuid(rnd, 'ar-'),
        project_id: proj.id,
        risk_name: `${pick(rnd, getRiskCategories())}-${i + 1}`,
        description: pick(rnd, [
          i18n.t('shared._mock.k147'),
          i18n.t('shared._mock.k146'),
          i18n.t('shared._mock.k145'),
          i18n.t('shared._mock.k144'),
        ]),
        risk_category: pick(rnd, getRiskCategories()),
        severity,
        occurrence,
        detection,
        rpn: severity * occurrence * detection,
        status: pick(rnd, ['open', 'mitigated', 'closed']),
        mitigation_plan: pick(rnd, [
          i18n.t('shared._mock.k151'),
          i18n.t('shared._mock.k150'),
          i18n.t('shared._mock.k149'),
          i18n.t('shared._mock.k148'),
        ]),
        responsible: pick(rnd, getAuditors()),
        target_date: isoFutureDate(rnd, int(rnd, 14, 60)),
        created_at: proj.created_at,
        updated_at: isoDate(rnd, int(rnd, 0, 10)),
      });
    }
  });
  return risks;
}

function buildApqpApprovals(rnd: () => number, projects: ApqpProject[]): ApqpApproval[] {
  const approvals: ApqpApproval[] = [];
  projects.forEach((proj) => {
    const approvalCount = int(rnd, 1, 3);
    for (let i = 0; i < approvalCount; i++) {
      const submitted = rnd() > 0.3;
      const approved = submitted && rnd() > 0.4;
      approvals.push({
        id: uuid(rnd, 'aa-'),
        project_id: proj.id,
        approval_type: pick(rnd, ['phase_gate', 'design_review', 'process_change']),
        status: approved ? 'approved' : submitted ? 'pending' : 'draft',
        applicant: proj.leader,
        approver: approved ? pick(rnd, getAuditors()) : undefined,
        comment: approved
          ? i18n.t('shared._mock.k153')
          : submitted
            ? i18n.t('shared._mock.k152')
            : undefined,
        submitted_at: submitted ? isoDate(rnd, int(rnd, 0, 15)) : undefined,
        approved_at: approved ? isoDate(rnd, int(rnd, 0, 5)) : undefined,
        created_at: proj.created_at,
      });
    }
  });
  return approvals;
}

// ============================================================================
// BI 聚合类型 mock
// ============================================================================
function buildQualityOverview(rnd: () => number): QualityOverview {
  const totalInspections = int(rnd, 200, 500);
  const passRate = Math.round((85 + rnd() * 12) * 10) / 10;
  const defectRate = Math.round((100 - passRate) * 10) / 10;
  return {
    totalStandards: int(rnd, 30, 80),
    totalInspections,
    totalIssues: int(rnd, 20, 60),
    totalActions: int(rnd, 15, 45),
    passRate,
    defectRate,
    onTimeDeliveryRate: Math.round((88 + rnd() * 10) * 10) / 10,
    customerComplaintCount: int(rnd, 2, 12),
    qualityCostTotal: int(rnd, 500000, 2000000),
    qualityCostRatio: Math.round((2 + rnd() * 3) * 100) / 100,
    spcChartCount: int(rnd, 10, 30),
    fmeaCount: int(rnd, 8, 25),
    eightdCount: int(rnd, 5, 18),
    auditPlanCount: int(rnd, 8, 20),
    trendData: buildQualityTrendItems(rnd),
    topIssues: buildDefectDistributions(rnd),
    departmentPerformance: getDepartments().map((dept) => ({
      department: dept,
      passRate: Math.round((80 + rnd() * 18) * 10) / 10,
      issueCount: int(rnd, 2, 15),
    })),
  };
}

function buildQualityTrendItems(rnd: () => number): QualityTrendItem[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      passRate: Math.round((82 + rnd() * 16) * 10) / 10,
      defectCount: int(rnd, 5, 30),
      issueCount: int(rnd, 3, 15),
      inspectionCount: int(rnd, 150, 400),
    };
  });
}

function buildDefectDistributions(rnd: () => number): DefectDistribution[] {
  const categories = [
    i18n.t('shared._mock.k159'),
    i18n.t('shared._mock.k158'),
    i18n.t('shared._mock.k157'),
    i18n.t('shared._mock.k156'),
    i18n.t('shared._mock.k155'),
    i18n.t('shared._mock.k154'),
  ];
  const counts = categories.map(() => int(rnd, 5, 40));
  const total = counts.reduce((s, c) => s + c, 0);
  return categories.map((category, i) => ({
    category,
    count: counts[i],
    percentage: Math.round((counts[i] / total) * 1000) / 10,
  }));
}

// ============================================================================
// QMS Mock Shape — 聚合所有 mock 数据
// ============================================================================
export interface QmsMockShape {
  standards: QualityStandard[];
  inspections: QualityCheck[];
  issues: QualityIssue[];
  improvements: QualityImprovement[];
  auditPlans: AuditPlan[];
  auditTasks: AuditTask[];
  auditFindings: AuditFinding[];
  spcCharts: SpcChart[];
  spcDataPoints: SpcDataPoint[];
  qualityCosts: QualityCost[];
  eightDReports: EightDReport[];
  fmeaAnalyses: FmeaAnalysis[];
  fmeaItems: FmeaItem[];
  apqpProjects: ApqpProject[];
  apqpPhases: ApqpPhase[];
  apqpTasks: ApqpTask[];
  apqpRisks: ApqpRisk[];
  apqpApprovals: ApqpApproval[];
  qualityOverview: QualityOverview;
  qualityTrend: QualityTrendItem[];
  defectDistribution: DefectDistribution[];
}

// ============================================================================
// useQmsMock hook — 与 useCrmMock 模式一致
// ============================================================================
export function useQmsMock<T = unknown>(
  config: {
    seed?: number;
    scale?: number;
  } = {}
): { data: T; mockEnabled: boolean; refresh: () => void } {
  const seed = config.seed ?? 42;
  const scale = config.scale ?? 1;

  const envEnable =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ENABLE_QMS_MOCK ===
      'true';
  const demoEnable =
    typeof window !== 'undefined' &&
    (window as unknown as { __TOPEMS_DEMO__?: boolean }).__TOPEMS_DEMO__ === true;
  const envDisable =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_QMS_DISABLE_MOCK ===
      'true';
  const mockEnabled = (envEnable || demoEnable) && !envDisable;

  const rnd = mulberry32(seed + scale * 7919);

  const standards = buildStandards(rnd, int(rnd, 15, 30));
  const inspections = buildInspections(rnd, int(rnd, 30, 60));
  const issues = buildIssues(rnd, int(rnd, 15, 35));
  const improvements = buildImprovements(rnd, int(rnd, 10, 25));
  const auditPlans = buildAuditPlans(rnd, int(rnd, 8, 18));
  const auditTasks = buildAuditTasks(rnd, auditPlans);
  const auditFindings = buildAuditFindings(rnd, auditTasks);
  const spcCharts = buildSpcCharts(rnd, int(rnd, 8, 20));
  const spcDataPoints = buildSpcDataPoints(rnd, spcCharts);
  const qualityCosts = buildQualityCosts(rnd, int(rnd, 20, 45));
  const eightDReports = buildEightDReports(rnd, int(rnd, 5, 15));
  const fmeaAnalyses = buildFmeaAnalyses(rnd, int(rnd, 6, 15));
  const fmeaItems = buildFmeaItems(rnd, fmeaAnalyses);
  const apqpProjects = buildApqpProjects(rnd, int(rnd, 5, 12));
  const apqpPhases = buildApqpPhases(rnd, apqpProjects);
  const apqpTasks = buildApqpTasks(rnd, apqpProjects, apqpPhases);
  const apqpRisks = buildApqpRisks(rnd, apqpProjects);
  const apqpApprovals = buildApqpApprovals(rnd, apqpProjects);
  const qualityOverview = buildQualityOverview(rnd);
  const qualityTrend = buildQualityTrendItems(rnd);
  const defectDistribution = buildDefectDistributions(rnd);

  const allData: QmsMockShape = {
    standards,
    inspections,
    issues,
    improvements,
    auditPlans,
    auditTasks,
    auditFindings,
    spcCharts,
    spcDataPoints,
    qualityCosts,
    eightDReports,
    fmeaAnalyses,
    fmeaItems,
    apqpProjects,
    apqpPhases,
    apqpTasks,
    apqpRisks,
    apqpApprovals,
    qualityOverview,
    qualityTrend,
    defectDistribution,
  };

  return {
    data: allData as unknown as T,
    mockEnabled,
    refresh: () => {},
  };
}

export default useQmsMock;
