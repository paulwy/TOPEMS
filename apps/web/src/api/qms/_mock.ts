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
const STANDARD_CATEGORIES = ['来料检验', '过程检验', '成品检验', '出货检验'] as const;
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
const COST_CATEGORIES = ['设备', '人工', '材料', '管理', '外部'] as const;
const EIGHTD_SEVERITIES = ['critical', 'major', 'minor'] as const;
const EIGHTD_STATUSES = ['draft', 'd1_team', 'd3_containment', 'd4_root_cause', 'd5_permanent', 'closed'] as const;
const FMEA_TYPES = ['design', 'process', 'system', 'service'] as const;
const FMEA_STATUSES = ['draft', 'in_review', 'approved', 'obsolete'] as const;
const APQP_STATUSES = ['concept', 'planning', 'product_design', 'process_design', 'product_validation', 'production', 'closure'] as const;
const APQP_PHASES = [
  { code: 'P1', name: '计划和确定项目' },
  { code: 'P2', name: '产品设计和开发' },
  { code: 'P3', name: '过程设计和开发' },
  { code: 'P4', name: '产品和过程确认' },
  { code: 'P5', name: '反馈、评定和纠正措施' },
] as const;
const RISK_CATEGORIES = ['技术风险', '质量风险', '进度风险', '成本风险', '资源风险'] as const;
const DEPARTMENTS = ['质量部', '生产部', '技术部', '采购部', '销售部', '研发部'] as const;
const PRODUCTS = ['精密轴承-A型', '电机外壳-B型', '传感器模块-C型', '控制板-D型', '连接器-E型'] as const;
const CUSTOMERS = ['华东重工', '华南电子', '华北汽车', '西部能源', '中部航空'] as const;
const AUDITORS = ['张质量', '李审计', '王检查', '刘品控', '陈监督'] as const;

// ============================================================================
// 10 实体 mock 数据生成函数
// ============================================================================

// E-1 QualityStandard
function buildStandards(rnd: () => number, count: number): QualityStandard[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = isoDate(rnd, int(rnd, 1, 365));
    return {
      id: uuid(rnd, 'std-'),
      name: `${pick(rnd, STANDARD_CATEGORIES)}标准-${String(i + 1).padStart(3, '0')}`,
      code: `QS-${String(i + 1).padStart(4, '0')}`,
      category: pick(rnd, STANDARD_CATEGORIES),
      version: `v${int(rnd, 1, 3)}.${int(rnd, 0, 9)}`,
      description: `${pick(rnd, STANDARD_CATEGORIES)}的检验规范与验收准则`,
      content: `本标准规定了${pick(rnd, PRODUCTS)}的检验项目、方法及合格判定标准。`,
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
      product_name: pick(rnd, PRODUCTS),
      standard_id: uuid(rnd, 'std-'),
      quantity,
      qualified_quantity: qualified,
      unqualified_quantity: unqualified,
      qualification_rate: Math.round((qualified / quantity) * 1000) / 10,
      status: pick(rnd, INSPECTION_STATUSES),
      inspector: pick(rnd, AUDITORS),
      assignee: pick(rnd, AUDITORS),
      inspected_at: isoDate(rnd, int(rnd, 0, 30)),
      result: pick(rnd, ['pass', 'conditional_pass', 'fail']),
      memo: rnd() > 0.7 ? '需复核部分项目' : undefined,
      created_by: pick(rnd, AUDITORS),
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
      title: `${pick(rnd, PRODUCTS)}${pick(rnd, ['尺寸超差', '表面缺陷', '功能异常', '装配不良'])}`,
      description: `在${pick(rnd, STANDARD_CATEGORIES)}过程中发现${pick(rnd, ['批量性', '偶发性', '系统性'])}问题，需及时处理。`,
      severity: pick(rnd, ISSUE_SEVERITIES),
      category: pick(rnd, STANDARD_CATEGORIES),
      status: pick(rnd, ISSUE_STATUSES),
      assignee: pick(rnd, AUDITORS),
      due_date: isoFutureDate(rnd, int(rnd, 7, 30)),
      resolution: rnd() > 0.5 ? '已采取纠正措施并验证有效' : undefined,
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
      title: `${pick(rnd, ['优化', '改进', '提升'])}${pick(rnd, ['检验流程', '质量控制', '缺陷预防'])}`,
      description: `针对${pick(rnd, PRODUCTS)}的质量问题，制定纠正与预防措施。`,
      category: pick(rnd, STANDARD_CATEGORIES),
      status: pick(rnd, ACTION_STATUSES),
      proposer: pick(rnd, AUDITORS),
      assignee: pick(rnd, AUDITORS),
      improvement_effect: rnd() > 0.5 ? '合格率提升 3.2%' : undefined,
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
      title: `${pick(rnd, AUDIT_TYPES)}审核计划-${String(i + 1).padStart(2, '0')}`,
      description: `对${pick(rnd, DEPARTMENTS)}进行${pick(rnd, AUDIT_TYPES)}审核`,
      audit_type: pick(rnd, AUDIT_TYPES),
      status: pick(rnd, AUDIT_PLAN_STATUSES),
      auditor: pick(rnd, AUDITORS),
      auditors: Array.from({ length: int(rnd, 2, 4) }, () => pick(rnd, AUDITORS)),
      start_date: startDate,
      end_date: isoFutureDate(rnd, int(rnd, 31, 60)),
      departments: Array.from({ length: int(rnd, 1, 3) }, () => pick(rnd, DEPARTMENTS)),
      planned_date: startDate,
      scope: pick(rnd, ['全要素审核', '专项审核', '跟踪审核']),
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
        title: `${pick(rnd, DEPARTMENTS)}审核任务-${i + 1}`,
        description: `审核${pick(rnd, DEPARTMENTS)}的${pick(rnd, ['流程合规性', '记录完整性', '制度执行'])}`,
        status: pick(rnd, ['pending', 'in_progress', 'completed']),
        assigned_to: pick(rnd, AUDITORS),
        assignee: pick(rnd, AUDITORS),
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
        title: `${pick(rnd, ['文件缺失', '记录不完整', '流程偏差', '资源不足'])}发现`,
        description: `审核中发现${pick(rnd, DEPARTMENTS)}存在${pick(rnd, ['文件', '记录', '流程'])}方面的问题`,
        severity: pick(rnd, AUDIT_FINDING_SEVERITIES),
        category: pick(rnd, ['文件管理', '过程控制', '人员资质', '设备校准']),
        status: pick(rnd, ['open', 'in_review', 'confirmed', 'rectified', 'verified']),
        recommendation: `建议${pick(rnd, ['补充相关文件', '完善记录', '优化流程', '加强培训'])}`,
        assigned_to: pick(rnd, AUDITORS),
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
      chartName: `${pick(rnd, PRODUCTS)}控制图-${i + 1}`,
      chartType: pick(rnd, SPC_CHART_TYPES),
      productName: pick(rnd, PRODUCTS),
      processName: pick(rnd, ['车削', '铣削', '装配', '焊接', '检测']),
      characteristic: pick(rnd, ['外径', '内径', '长度', '厚度', '硬度']),
      unit: pick(rnd, ['mm', 'μm', '°C', 'N', 'Hz']),
      usl: int(rnd, 100, 110),
      lsl: int(rnd, 90, 100),
      target: int(rnd, 99, 101),
      ucl: int(rnd, 102, 106),
      lcl: int(rnd, 94, 98),
      cl: int(rnd, 99, 101),
      sampleSize: pick(rnd, [4, 5, 6, 8]),
      samplingFrequency: pick(rnd, ['每小时', '每2小时', '每班次', '每日']),
      status: pick(rnd, ['active', 'inactive']),
      description: `${pick(rnd, PRODUCTS)}关键尺寸统计过程控制`,
      createdBy: pick(rnd, AUDITORS),
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
      const values = Array.from({ length: chart.sampleSize }, () =>
        Math.round(((chart.cl ?? 100) + (rnd() - 0.5) * 4) * 100) / 100,
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
        stdDev: Math.round(Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) * 100) / 100,
        isOutOfControl: isOOC,
        violationRules: isOOC ? [pick(rnd, ['rule1', 'rule2', 'rule3'])] : undefined,
        operator: pick(rnd, AUDITORS),
        remark: isOOC ? '超出控制限' : undefined,
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
      costCategory: pick(rnd, COST_CATEGORIES),
      amount: int(rnd, 5000, 200000),
      currency: 'CNY',
      occurrenceDate: createdAt,
      department: pick(rnd, DEPARTMENTS),
      relatedOrderNo: rnd() > 0.5 ? `PO-${int(rnd, 1000, 9999)}` : undefined,
      description: `${pick(rnd, COST_TYPES)}成本记录`,
      responsiblePerson: pick(rnd, AUDITORS),
      status: pick(rnd, ['confirmed', 'pending', 'rejected']),
      createdBy: pick(rnd, AUDITORS),
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
      title: `${pick(rnd, PRODUCTS)}${pick(rnd, ['客诉', '批量不合格', '过程异常'])}8D报告`,
      problemDescription: `客户反馈${pick(rnd, PRODUCTS)}存在${pick(rnd, ['尺寸超差', '外观缺陷', '功能失效'])}问题`,
      severity: pick(rnd, EIGHTD_SEVERITIES),
      source: pick(rnd, ['customer_complaint', 'internal_audit', 'process_deviation']),
      productId: uuid(rnd, 'prod-'),
      productName: pick(rnd, PRODUCTS),
      customer: pick(rnd, CUSTOMERS),
      status: pick(rnd, EIGHTD_STATUSES),
      currentStage: stage,
      teamLeader: pick(rnd, AUDITORS),
      teamMembers: Array.from({ length: int(rnd, 3, 6) }, () => pick(rnd, AUDITORS)),
      d1TeamEstablished: stage >= 1,
      d2ProblemDescribed: stage >= 2,
      d3ContainmentImplemented: stage >= 3,
      d4RootCauseIdentified: stage >= 4,
      d5PermanentActionSelected: stage >= 5,
      d6ActionVerified: stage >= 6,
      d7PreventiveImplemented: stage >= 7,
      d8TeamRecognized: stage >= 8,
      d1Content: stage >= 1 ? `团队组长：${pick(rnd, AUDITORS)}，成员：${int(rnd, 3, 6)}人` : undefined,
      d2Content: stage >= 2 ? `问题描述：${pick(rnd, PRODUCTS)}在${pick(rnd, STANDARD_CATEGORIES)}中发现异常` : undefined,
      d3Content: stage >= 3 ? `临时措施：隔离库存，加严检验` : undefined,
      d4Content: stage >= 4 ? `根因分析：${pick(rnd, ['设备精度不足', '操作失误', '物料异常'])}` : undefined,
      d5Content: stage >= 5 ? `永久措施：${pick(rnd, ['更换设备', '修订作业指导书', '加强培训'])}` : undefined,
      d6Content: stage >= 6 ? `验证结果：措施有效，合格率恢复` : undefined,
      d7Content: stage >= 7 ? `预防措施：更新FMEA与控制计划` : undefined,
      d8Content: stage >= 8 ? `团队认可：表彰相关人员` : undefined,
      dueDate: isoFutureDate(rnd, int(rnd, 7, 30)),
      closedAt: stage >= 8 ? isoDate(rnd, int(rnd, 0, 5)) : undefined,
      createdBy: pick(rnd, AUDITORS),
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
      fmeaName: `${pick(rnd, PRODUCTS)}${pick(rnd, FMEA_TYPES)}FMEA`,
      fmeaType: pick(rnd, FMEA_TYPES),
      productName: pick(rnd, PRODUCTS),
      processName: pick(rnd, ['车削', '铣削', '装配', '焊接']),
      version: `v${int(rnd, 1, 3)}.${int(rnd, 0, 9)}`,
      status: pick(rnd, FMEA_STATUSES),
      scope: pick(rnd, ['产品设计阶段', '过程设计阶段', '生产制造阶段']),
      teamLeader: pick(rnd, AUDITORS),
      teamMembers: Array.from({ length: int(rnd, 3, 5) }, () => pick(rnd, AUDITORS)),
      description: `${pick(rnd, PRODUCTS)}的${pick(rnd, FMEA_TYPES)}失效模式分析`,
      createdBy: pick(rnd, AUDITORS),
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
        functionDescription: `${pick(rnd, ['提供结构支撑', '传递动力', '密封防护', '电气连接'])}`,
        failureMode: pick(rnd, ['断裂', '变形', '磨损', '腐蚀', '松动']),
        failureEffect: pick(rnd, ['功能丧失', '性能下降', '安全隐患', '外观不良']),
        severity,
        failureCause: pick(rnd, ['材料强度不足', '加工误差', '装配不当', '环境影响']),
        occurrence,
        currentControls: pick(rnd, ['过程检验', '防错装置', 'SPC监控', '来料检验']),
        detection,
        rpn: severity * occurrence * detection,
        recommendedActions: pick(rnd, ['优化材料选型', '增加过程检验频次', '改进工装设计']),
        responsibility: pick(rnd, AUDITORS),
        targetDate: isoFutureDate(rnd, int(rnd, 14, 60)),
        actionsTaken: rnd() > 0.5 ? '已完成改进并验证' : undefined,
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
      project_name: `${pick(rnd, PRODUCTS)}APQP项目`,
      product_id: uuid(rnd, 'prod-'),
      product_name: pick(rnd, PRODUCTS),
      customer: pick(rnd, CUSTOMERS),
      description: `${pick(rnd, CUSTOMERS)}定制${pick(rnd, PRODUCTS)}新产品开发项目`,
      status: pick(rnd, APQP_STATUSES),
      current_phase: pick(rnd, APQP_PHASES).code,
      leader: pick(rnd, AUDITORS),
      team: Array.from({ length: int(rnd, 3, 6) }, () => pick(rnd, AUDITORS)).join(','),
      start_date: createdAt,
      target_date: isoFutureDate(rnd, int(rnd, 30, 365)),
      actualEndDate: progress >= 100 ? isoDate(rnd, int(rnd, 0, 10)) : undefined,
      progress,
      risklevel: pick(rnd, ['low', 'medium', 'high']),
      created_by: pick(rnd, AUDITORS),
      created_at: createdAt,
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildApqpPhases(rnd: () => number, projects: ApqpProject[]): ApqpPhase[] {
  const phases: ApqpPhase[] = [];
  projects.forEach((proj, pi) => {
    APQP_PHASES.forEach((phaseDef, i) => {
      const phaseProgress = (proj.progress ?? 0) >= (i + 1) * 20 ? 100 : Math.max(0, (proj.progress ?? 0) - i * 20);
      phases.push({
        id: uuid(rnd, 'aph-'),
        project_id: proj.id,
        phase_code: phaseDef.code,
        phase_name: phaseDef.name,
        description: `${phaseDef.name}阶段`,
        status: phaseProgress >= 100 ? 'completed' : phaseProgress > 0 ? 'in_progress' : 'pending',
        start_date: i === 0 ? proj.start_date : undefined,
        end_date: phaseProgress >= 100 ? isoDate(rnd, int(rnd, 0, 30)) : undefined,
        actualStartDate: i === 0 ? proj.start_date : phaseProgress > 0 ? isoDate(rnd, int(rnd, 0, 60)) : undefined,
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

function buildApqpTasks(rnd: () => number, projects: ApqpProject[], phases: ApqpPhase[]): ApqpTask[] {
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
          task_name: `${phase.phase_name}-任务${i + 1}`,
          description: pick(rnd, ['可行性分析', '设计评审', '样件制作', '验证测试', '文件编制']),
          task_type: pick(rnd, ['analysis', 'design', 'validation', 'documentation']),
          deliverable: pick(rnd, ['分析报告', '设计图纸', '测试报告', '控制计划', '作业指导书']),
          status: pick(rnd, ['pending', 'in_progress', 'completed']),
          assignee: pick(rnd, AUDITORS),
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
        risk_name: `${pick(rnd, RISK_CATEGORIES)}-${i + 1}`,
        description: pick(rnd, ['技术方案不确定', '供应商能力不足', '进度压力', '成本超支风险']),
        risk_category: pick(rnd, RISK_CATEGORIES),
        severity,
        occurrence,
        detection,
        rpn: severity * occurrence * detection,
        status: pick(rnd, ['open', 'mitigated', 'closed']),
        mitigation_plan: pick(rnd, ['增加技术评审', '备选供应商', '调整进度计划', '预算预留']),
        responsible: pick(rnd, AUDITORS),
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
        approver: approved ? pick(rnd, AUDITORS) : undefined,
        comment: approved ? '同意' : submitted ? '待审批' : undefined,
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
    departmentPerformance: DEPARTMENTS.map((dept) => ({
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
  const categories = ['尺寸超差', '表面缺陷', '功能异常', '装配不良', '材料不符', '其他'];
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
export function useQmsMock<T = unknown>(config: {
  seed?: number;
  scale?: number;
} = {}): { data: T; mockEnabled: boolean; refresh: () => void } {
  const seed = config.seed ?? 42;
  const scale = config.scale ?? 1;

  const envEnable =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ENABLE_QMS_MOCK === 'true';
  const demoEnable =
    typeof window !== 'undefined' &&
    (window as unknown as { __TOPEMS_DEMO__?: boolean }).__TOPEMS_DEMO__ === true;
  const envDisable =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_QMS_DISABLE_MOCK === 'true';
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
