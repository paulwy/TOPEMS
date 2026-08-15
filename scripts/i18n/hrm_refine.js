#!/usr/bin/env node
/**
 * Phase-3b: HRM（人力资源）专业术语精修
 * 覆盖 hrm.json / 可能的顶层单独命名空间 employee/attendance/payroll/performance/contract/recruitment/training/department
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const DRY_RUN = process.argv.includes('--dry-run');

const HRM_TERMS = [
  // --- 组织架构 ---
  ['部门', 'Department', ''],
  ['子部门', 'Sub-department', ''],
  ['岗位', 'Position', 'HRIS 通用 Position；Role 是角色/Role-based access 不等同岗位'],
  ['职位', 'Job Title', 'Position 是岗位（编制）；Job Title 是具体职位头衔（名片上的）'],
  ['职级', 'Job Level', ''],
  ['编制', 'Headcount', ''],
  ['缺编', 'Open Headcount', ''],

  // --- 员工状态（HRIS 惯例：Active = 在职；Terminated = 已离职（含辞职/辞退/退休）；Probation = 试用期）---
  ['在职员工', 'Active Employees', ''],
  ['试用期员工', 'Probationary Employees', '原 Probation Employees 缺形容词；Probationary 为标准'],
  ['离职员工', 'Terminated Employees', '标准 HRIS 译法；Resigned Employees 仅指主动辞职，覆盖不全；Inactive Employees 是"非活跃"语义'],
  ['正式员工', 'Regular Employees', ''],
  ['实习生', 'Intern', ''],
  ['兼职员工', 'Part-time Employee', ''],
  ['全职员工', 'Full-time Employee', ''],
  ['外包员工', 'Contractor', '比 Outsourced Employee 更地道'],
  ['劳务派遣', 'Temporary Staffing', ''],
  ['试用期', 'Probation Period', ''],
  ['转正', 'Confirmation', 'Confirmation in Role / Become Regular 太长；Confirmation 是 HRIS 惯例（转正确认）'],
  ['试用期满', 'End of Probation', ''],

  // --- 入职离职流程 ---
  ['入职', 'Onboarding', ''],
  ['新员工入职', 'New Hire Onboarding', ''],
  ['入职日期', 'Hire Date', ''],
  ['入职引导', 'Onboarding', ''],
  ['离职', 'Termination', '流程层面；状态层面走 Terminated'],
  ['主动离职', 'Voluntary Resignation', ''],
  ['被动离职', 'Involuntary Termination', ''],
  ['辞退', 'Dismissal', ''],
  ['退休', 'Retirement', ''],
  ['离职日期', 'Termination Date', ''],
  ['离职交接', 'Offboarding Handover', ''],
  ['离职面谈', 'Exit Interview', ''],
  ['调动', 'Transfer', ''],
  ['晋升', 'Promotion', ''],
  ['降职', 'Demotion', ''],
  ['终止劳动关系', 'Employment Termination', '原有 Terminate Employee 正确，补充术语'],

  // --- 合同（劳动法领域）---
  ['劳动合同', 'Employment Contract', '原有 Labor Contract 直译"劳务/劳动"合同（含集体合同）；员工合同统一 Employment Contract'],
  ['固定期限劳动合同', 'Fixed-term Employment Contract', ''],
  ['无固定期限劳动合同', 'Open-ended Employment Contract', ''],
  ['以完成一定工作任务为期限的劳动合同', 'Task-based Employment Contract', ''],
  ['试用期合同', 'Probation Contract', '原有正确'],
  ['实习协议', 'Internship Agreement', ''],
  ['劳务协议', 'Service Agreement', ''],
  ['保密协议', 'Confidentiality Agreement (NDA)', ''],
  ['竞业限制', 'Non-Compete Agreement', 'V226 已有规划；标准译法'],
  ['服务期协议', 'Service Period Agreement', ''],
  ['合同期限', 'Contract Term', ''],
  ['合同起始日期', 'Contract Start Date', ''],
  ['合同终止日期', 'Contract End Date', ''],
  ['合同续签', 'Contract Renewal', ''],
  ['合同变更', 'Contract Amendment', ''],
  ['合同解除', 'Contract Termination', ''],
  ['到期提醒', 'Expiry Reminder', ''],

  // --- 薪酬社保公积金（中国语境专用）---
  ['五险一金', 'Social Insurance & Housing Fund', '业内惯例翻译；直译成 Five Insurances and One Fund 外行看不懂'],
  ['社保', 'Social Insurance', '中国"社会保险"专用；Social Security 是美国 Social Security 体系（养老金福利局），绝不可混用'],
  ['社会保险', 'Social Insurance', ''],
  ['住房公积金', 'Housing Fund', '简称 HPF，但 UI 写全称 Housing Fund；Housing Provident Fund 是更正式全称'],
  ['社保公积金', 'Social Insurance & Housing Fund', ''],
  ['基本养老保险', 'Basic Pension Insurance', ''],
  ['基本医疗保险', 'Basic Medical Insurance', ''],
  ['失业保险', 'Unemployment Insurance', ''],
  ['工伤保险', 'Work Injury Insurance', ''],
  ['生育保险', 'Maternity Insurance', ''],
  ['住房公积金（个人）', 'Housing Fund (Individual Contribution)', ''],
  ['社保公积金（个人）', 'Social Insurance & Housing Fund (Individual)', '原有正确'],
  ['个人所得税', 'Individual Income Tax (IIT)', '中国个人所得税专用简称 PIT/IIT 行业通用 PIT；两种缩写都可'],
  ['个税', 'Individual Income Tax', ''],
  ['薪资', 'Salary', '月薪/年薪整体'],
  ['薪酬', 'Compensation', '整体薪酬包：薪资 + 奖金 + 福利'],
  ['基本工资', 'Base Salary', ''],
  ['绩效奖金', 'Performance Bonus', ''],
  ['年终奖', 'Annual Bonus', ''],
  ['加班费', 'Overtime Pay', ''],
  ['补贴', 'Allowance', ''],
  ['津贴', 'Subsidy', 'Allowance 是岗位/职责性质补贴；Subsidy 是政策性/生活性津贴'],
  ['税前工资', 'Gross Salary', ''],
  ['税后工资', 'Net Salary', ''],
  ['应发工资', 'Gross Pay', ''],
  ['实发工资', 'Net Pay', ''],
  ['工资条', 'Payslip', ''],
  ['薪资发放', 'Payroll Disbursement', '原有 Salary Disbursement 也对，Payroll 更专业'],
  ['调薪', 'Salary Adjustment', ''],
  ['薪酬调整', 'Compensation Adjustment', ''],

  // --- 考勤请假 ---
  ['考勤', 'Attendance', ''],
  ['签到', 'Check-in', ''],
  ['签退', 'Check-out', ''],
  ['打卡', 'Punch', '通用；Clock-in/out 也可；UI 用 Punch 更简洁'],
  ['迟到', 'Late', ''],
  ['早退', 'Early Leave', ''],
  ['旷工', 'Absent', ''],
  ['请假', 'Leave Request', ''],
  ['年假', 'Annual Leave', ''],
  ['病假', 'Sick Leave', ''],
  ['事假', 'Personal Leave', ''],
  ['婚假', 'Marriage Leave', ''],
  ['产假', 'Maternity Leave', ''],
  ['陪产假', 'Paternity Leave', ''],
  ['丧假', 'Bereavement Leave', ''],
  ['调休', 'Compensatory Leave', 'TOIL（Time Off In Lieu）缩写也可，UI 用全称'],
  ['加班', 'Overtime', ''],
  ['出差', 'Business Trip', ''],
  ['外出办公', 'Work from Site', '或 Off-site Work'],
  ['远程办公', 'Remote Work', ''],

  // --- 绩效培训招聘 ---
  ['绩效考核', 'Performance Review', 'HRIS 惯例（Performance Appraisal 是更正式评估；Performance Review 是年度/半年度常规的）'],
  ['绩效评估', 'Performance Appraisal', ''],
  ['绩效管理', 'Performance Management', ''],
  ['绩效分数', 'Performance Score', ''],
  ['绩效等级', 'Performance Rating', ''],
  ['关键绩效指标', 'KPI', ''],
  ['目标设定', 'Goal Setting', ''],
  ['360度反馈', '360° Feedback', ''],
  ['OKR', 'OKR', ''],
  ['培训', 'Training', ''],
  ['培训计划', 'Training Program', ''],
  ['培训课程', 'Training Course', ''],
  ['培训记录', 'Training Record', ''],
  ['新员工培训', 'New Hire Training', ''],
  ['岗位培训', 'On-the-job Training (OJT)', ''],
  ['招聘', 'Recruitment', ''],
  ['招聘需求', 'Recruitment Requisition', ''],
  ['招聘岗位', 'Open Position', ''],
  ['招聘负责人', 'Recruiter', ''],
  ['候选人', 'Candidate', ''],
  ['简历', 'Resume', 'CV 也可但北美 US 产品用 Resume'],
  ['面试', 'Interview', ''],
  ['Offer', 'Job Offer', ''],
  ['录用', 'Offer Acceptance', ''],
  ['入职体检', 'Pre-employment Medical Check', ''],
  ['背景调查', 'Background Check', ''],

  // --- 报销/费用（HRM 可能与 Finance 共享）---
  ['报销', 'Reimbursement', ''],
  ['报销单', 'Reimbursement Claim', ''],
  ['差旅费', 'Travel Expense', ''],
  ['业务招待费', 'Business Entertainment', ''],

  // --- 福利 ---
  ['福利', 'Benefits', ''],
  ['员工福利', 'Employee Benefits', ''],
  ['团体保险', 'Group Insurance', ''],
  ['补充医疗保险', 'Supplementary Medical Insurance', ''],
  ['餐补', 'Meal Allowance', ''],
  ['交通补贴', 'Transport Allowance', ''],
  ['通讯补贴', 'Communication Allowance', ''],
  ['节日福利', 'Festival Benefit', ''],
];

function flatten(obj, prefix = '', out = new Map()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out.set(p, v);
  }
  return out;
}
function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function main() {
  const zhMap = new Map(HRM_TERMS.map(([zh, en, note]) => [zh, { en, note }]));
  const allNs = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const hrmNs = allNs.filter(n => /^(hrm|employee|department|attendance|payroll|performance|contract|recruitment|training|salary|benefit|position|onboard|offboard)/i.test(n));

  let total = 0;
  const termHits = new Map();
  const perNs = {};

  for (const ns of hrmNs) {
    const zhPath = path.join(ZH_DIR, ns + '.json');
    const enPath = path.join(EN_DIR, ns + '.json');
    if (!fs.existsSync(zhPath) || !fs.existsSync(enPath)) continue;
    const zhObj = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    let changed = false, count = 0;
    const samples = [];
    for (const [p, zv] of zhFlat) {
      const zh = (zv || '').trim(); if (!zh) continue;
      const ent = zhMap.get(zh); if (!ent) continue;
      const cur = (enFlat.get(p) || '').trim();
      if (!cur || cur === ent.en) continue;
      if (cur.toLowerCase() === ent.en.toLowerCase()) continue;
      // 特殊：允许 "$value 劳动合同" 这种嵌入模板变量的情况
      // 如果 zh 是整句匹配但 cur 里带变量前缀，则只替换精确的后缀部分
      if (/\$\{.*\}/.test(cur) && cur.endsWith(zhMap.get(zh) || '')) continue;
      setByPath(enNew, p, ent.en);
      changed = true; count++; total++;
      termHits.set(zh, (termHits.get(zh) || 0) + 1);
      if (samples.length < 5) samples.push({ p, old: cur, new: ent.en });
    }
    perNs[ns] = { count, samples };
    if (changed && !DRY_RUN) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }
  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] HRM 领域精修完成`);
  console.log('  处理命名空间      :', hrmNs.length);
  console.log('  发生替换          :', Object.values(perNs).filter(v => v.count > 0).length);
  console.log('  总替换条数        :', total);
  const byNs = Object.entries(perNs).sort((a, b) => b[1].count - a[1]);
  for (const [ns, v] of byNs) {
    if (v.count === 0) continue;
    console.log(`    ${ns}: ${v.count}`);
  }
  const top = [...termHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [zh, c] of top) {
    const en = zhMap.get(zh)?.en || '';
    console.log(`    "${zh}" → "${en}"  ×${c}`);
  }
}

main();
