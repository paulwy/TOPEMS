#!/usr/bin/env node
/**
 * V227 X-P0+ · 假 en 值批量翻译脚本（翻译记忆 + 术语表双重覆盖）
 *
 * 问题：en.json 中 7,314 条叶子值是中文原文（非空但未翻译）
 * 策略：
 *   1. 翻译记忆（Translation Memory）：从所有 en.json 已翻译的 zh→en 配对中
 *      构建"中文整句 → 英文译法（按频率取最高）"映射
 *   2. 术语表（glossary.csv + finance_refine + hrm_refine）：zh 精确匹配术语
 *   3. 对每个残留中文叶子，先查翻译记忆（整句匹配），再查术语表（整句=术语）
 *   4. 剩余无法自动翻译的，输出到 pending_translate.json 供 LLM 批量处理
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const DRY_RUN = process.argv.includes('--dry-run');

// ---------- 1. 加载术语表（glossary.csv + finance/hrm 内联术语）----------
function readGlossary(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\ufeff/, '');
  const lines = raw.split(/\r?\n/);
  const map = new Map();
  for (const line of lines) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const cells = line.match(/(".*?"|[^,]+)/g) || [];
    if (cells.length < 2) continue;
    const unquote = s => (s && s.startsWith('"')) ? s.slice(1, -1).replace(/""/g, '"') : (s || '');
    const zh = unquote(cells[0]);
    const en = unquote(cells[1]);
    if (zh && en) map.set(zh, en);
  }
  return map;
}

// Finance + HRM 术语表内联（从 finance_refine.js / hrm_refine.js 提取关键条目）
const FINANCE_TERMS = new Map([
  ['增值税专用发票', 'Special VAT Invoice'], ['增值税普通发票', 'General VAT Invoice'],
  ['累计折旧', 'Accumulated Depreciation'], ['累计摊销', 'Accumulated Amortization'],
  ['固定资产', 'Fixed Assets'], ['无形资产', 'Intangible Assets'],
  ['资产负债表', 'Balance Sheet'], ['利润表', 'Income Statement'],
  ['现金流量表', 'Cash Flow Statement'], ['试算平衡表', 'Trial Balance'],
  ['转账凭证', 'Transfer Voucher'], ['付款凭证', 'Payment Voucher'],
  ['收款凭证', 'Receipt Voucher'], ['记账凭证', 'Journal Voucher'],
  ['期初余额', 'Opening Balance'], ['期末余额', 'Closing Balance'],
  ['应收账款', 'Accounts Receivable'], ['应付账款', 'Accounts Payable'],
  ['银行对账', 'Bank Reconciliation'], ['账龄分析', 'Aging Analysis'],
  ['成本中心', 'Cost Center'], ['利润中心', 'Profit Center'],
  ['应税收入', 'Taxable Revenue'], ['进项税额', 'Input VAT'], ['销项税额', 'Output VAT'],
  ['计提折旧', 'Charge Depreciation'], ['资产处置', 'Asset Disposal'],
  ['合同期限', 'Contract Term'], ['合同续签', 'Contract Renewal'],
  ['合同类型', 'Contract Type'], ['合同开始日期', 'Contract Start Date'],
  ['合同结束日期', 'Contract End Date'],
]);

const HRM_TERMS = new Map([
  ['五险一金', 'Social Insurance & Housing Fund'], ['社保', 'Social Insurance'],
  ['社会保险', 'Social Insurance'], ['住房公积金', 'Housing Fund'],
  ['社保公积金', 'Social Insurance & Housing Fund'],
  ['个人所得税', 'Individual Income Tax (IIT)'], ['个税', 'Individual Income Tax'],
  ['劳动合同', 'Employment Contract'], ['试用期合同', 'Probation Contract'],
  ['试用期', 'Probation Period'], ['试用期员工', 'Probationary Employees'],
  ['离职员工', 'Terminated Employees'], ['在职员工', 'Active Employees'],
  ['正式员工', 'Regular Employees'], ['实习生', 'Intern'],
  ['入职', 'Onboarding'], ['入职日期', 'Hire Date'], ['离职', 'Termination'],
  ['离职日期', 'Termination Date'], ['离职面谈', 'Exit Interview'],
  ['调动', 'Transfer'], ['晋升', 'Promotion'], ['降职', 'Demotion'],
  ['竞业限制', 'Non-Compete Agreement'], ['保密协议', 'Confidentiality Agreement (NDA)'],
  ['考勤', 'Attendance'], ['签到', 'Check-in'], ['签退', 'Check-out'],
  ['迟到', 'Late'], ['早退', 'Early Leave'], ['旷工', 'Absent'],
  ['请假', 'Leave Request'], ['年假', 'Annual Leave'], ['病假', 'Sick Leave'],
  ['事假', 'Personal Leave'], ['婚假', 'Marriage Leave'], ['产假', 'Maternity Leave'],
  ['陪产假', 'Paternity Leave'], ['丧假', 'Bereavement Leave'],
  ['调休', 'Compensatory Leave'], ['加班', 'Overtime'], ['出差', 'Business Trip'],
  ['绩效考核', 'Performance Review'], ['绩效评估', 'Performance Appraisal'],
  ['绩效管理', 'Performance Management'], ['绩效分数', 'Performance Score'],
  ['绩效等级', 'Performance Rating'], ['关键绩效指标', 'KPI'],
  ['培训', 'Training'], ['培训计划', 'Training Program'], ['培训课程', 'Training Course'],
  ['培训记录', 'Training Record'], ['新员工培训', 'New Hire Training'],
  ['招聘', 'Recruitment'], ['招聘岗位', 'Open Position'], ['招聘负责人', 'Recruiter'],
  ['候选人', 'Candidate'], ['简历', 'Resume'], ['面试', 'Interview'],
  ['薪酬', 'Compensation'], ['薪资', 'Salary'], ['基本工资', 'Base Salary'],
  ['绩效奖金', 'Performance Bonus'], ['年终奖', 'Annual Bonus'],
  ['加班费', 'Overtime Pay'], ['补贴', 'Allowance'], ['津贴', 'Subsidy'],
  ['税前工资', 'Gross Salary'], ['税后工资', 'Net Salary'],
  ['应发工资', 'Gross Pay'], ['实发工资', 'Net Pay'], ['工资条', 'Payslip'],
  ['薪资发放', 'Payroll Disbursement'], ['调薪', 'Salary Adjustment'],
  ['部门', 'Department'], ['岗位', 'Position'], ['职位', 'Job Title'],
  ['职级', 'Job Level'], ['编制', 'Headcount'],
  ['福利', 'Benefits'], ['员工福利', 'Employee Benefits'],
  ['报销', 'Reimbursement'], ['报销单', 'Reimbursement Claim'],
  ['差旅费', 'Travel Expense'], ['业务招待费', 'Business Entertainment'],
  ['转正', 'Confirmation'], ['试用期满', 'End of Probation'],
  ['新员工入职', 'New Hire Onboarding'], ['入职引导', 'Onboarding'],
  ['主动离职', 'Voluntary Resignation'], ['被动离职', 'Involuntary Termination'],
  ['辞退', 'Dismissal'], ['退休', 'Retirement'],
  ['离职交接', 'Offboarding Handover'], ['终止劳动关系', 'Employment Termination'],
  ['合同解除', 'Contract Termination'], ['合同变更', 'Contract Amendment'],
  ['到期提醒', 'Expiry Reminder'],
  ['固定期限劳动合同', 'Fixed-term Employment Contract'],
  ['无固定期限劳动合同', 'Open-ended Employment Contract'],
  ['实习协议', 'Internship Agreement'], ['劳务协议', 'Service Agreement'],
  ['服务期协议', 'Service Period Agreement'],
  ['基本养老保险', 'Basic Pension Insurance'], ['基本医疗保险', 'Basic Medical Insurance'],
  ['失业保险', 'Unemployment Insurance'], ['工伤保险', 'Work Injury Insurance'],
  ['生育保险', 'Maternity Insurance'],
  ['补充医疗保险', 'Supplementary Medical Insurance'],
  ['团体保险', 'Group Insurance'],
  ['餐补', 'Meal Allowance'], ['交通补贴', 'Transport Allowance'],
  ['通讯补贴', 'Communication Allowance'], ['节日福利', 'Festival Benefit'],
  ['背景调查', 'Background Check'], ['入职体检', 'Pre-employment Medical Check'],
  ['录用', 'Offer Acceptance'], ['360度反馈', '360° Feedback'],
  ['目标设定', 'Goal Setting'], ['岗位培训', 'On-the-job Training (OJT)'],
  ['远程办公', 'Remote Work'], ['外出办公', 'Work from Site'],
  ['月度考勤', 'Monthly Attendance'], ['考勤汇总', 'Attendance Summary'],
  ['加班时长', 'Overtime Hours'], ['员工总数', 'Total Employees'],
  ['员工详情', 'Employee Detail'], ['员工管理', 'Employee Management'],
  ['部门管理', 'Department Management'], ['考勤管理', 'Attendance Management'],
  ['薪酬管理', 'Payroll Management'], ['绩效管理', 'Performance Management'],
  ['招聘管理', 'Recruitment Management'], ['培训管理', 'Training Management'],
  ['合同管理', 'Contract Management'],
]);

// ---------- 2. 构建翻译记忆库 ----------
function buildTranslationMemory() {
  // 从所有 en.json 已翻译的叶子（值是英文，不是中文）构建 zh→en 映射
  // zh 来自 zh.json 同 path 的值
  const tm = new Map(); // zh_full -> Map(en_translation -> count)
  const nsNames = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const cjkRe = /[\u4e00-\u9fff]{2,}/;

  for (const ns of nsNames) {
    const zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, ns + '.json'), 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    for (const [p, zhVal] of zhFlat) {
      const zv = (zhVal || '').trim();
      if (!zv || !cjkRe.test(zv)) continue; // 只收集中文叶子
      const ev = (enFlat.get(p) || '').trim();
      if (!ev) continue;
      if (cjkRe.test(ev)) continue; // en 值如果也是中文，跳过（这是待修的假值）
      // en 值是英文，加入翻译记忆
      let m = tm.get(zv);
      if (!m) { m = new Map(); tm.set(zv, m); }
      m.set(ev, (m.get(ev) || 0) + 1);
    }
  }
  // 取每个 zh 的最高频 en 译法
  const tmBest = new Map();
  for (const [zh, ens] of tm) {
    const best = [...ens.entries()].sort((a, b) => b[1] - a[1])[0];
    tmBest.set(zh, { en: best[0], count: best[1], variants: ens.size });
  }
  return tmBest;
}

// ---------- 3. 扫描残留中文叶子 + 翻译 ----------
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
  console.log('[1/3] 加载术语表...');
  const glossary = readGlossary(path.join(__dirname, 'glossary.csv'));
  console.log('  glossary.csv:', glossary.size, '条');
  console.log('  finance_terms:', FINANCE_TERMS.size, '条');
  console.log('  hrm_terms:', HRM_TERMS.size, '条');

  console.log('[2/3] 构建翻译记忆库...');
  const tm = buildTranslationMemory();
  console.log('  翻译记忆条目:', tm.size, '条（zh→en 唯一配对）');

  console.log('[3/3] 扫描残留中文叶子并翻译...');
  const cjkRe = /[\u4e00-\u9fff]{2,}/;
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

  let totalResidue = 0;
  let tmHits = 0;       // 翻译记忆命中
  let glossaryHits = 0; // 术语表命中
  let financeHits = 0;
  let hrmHits = 0;
  let pending = 0;      // 无法自动翻译
  const pendingByNs = {};
  const pendingList = [];

  for (const ns of nsNames) {
    const enPath = path.join(EN_DIR, ns + '.json');
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const enFlat = flatten(enObj);
    let changed = false;

    for (const [p, val] of enFlat) {
      const v = (val || '').trim();
      if (!v || !cjkRe.test(v)) continue; // 不是中文，跳过
      // 排除含模板变量的（${xxx}）
      if (/\$\{.*\}/.test(v)) {
        // 含变量的也尝试翻译，但需要特殊处理
      }
      totalResidue++;
      let translated = null;
      let source = '';

      // 1) 翻译记忆精确匹配（整句）
      const tmEntry = tm.get(v);
      if (tmEntry) {
        translated = tmEntry.en;
        source = 'TM';
        tmHits++;
      }
      // 2) 通用术语表
      if (!translated && glossary.has(v)) {
        translated = glossary.get(v);
        source = 'GLOSSARY';
        glossaryHits++;
      }
      // 3) Finance 术语表
      if (!translated && FINANCE_TERMS.has(v)) {
        translated = FINANCE_TERMS.get(v);
        source = 'FINANCE';
        financeHits++;
      }
      // 4) HRM 术语表
      if (!translated && HRM_TERMS.has(v)) {
        translated = HRM_TERMS.get(v);
        source = 'HRM';
        hrmHits++;
      }

      if (translated) {
        setByPath(enNew, p, translated);
        changed = true;
      } else {
        pending++;
        pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
        pendingList.push({ ns, path: p, zh: v });
      }
    }

    if (changed && !DRY_RUN) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  // 输出 pending 清单
  const pendingPath = path.join(__dirname, 'pending_translate.json');
  fs.writeFileSync(pendingPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_residue: totalResidue,
    tm_hits: tmHits,
    glossary_hits: glossaryHits,
    finance_hits: financeHits,
    hrm_hits: hrmHits,
    auto_translated: tmHits + glossaryHits + financeHits + hrmHits,
    pending: pending,
    pending_by_ns: Object.fromEntries(Object.entries(pendingByNs).sort((a, b) => b[1] - a[1])),
    pending_items: pendingList,
  }, null, 2), 'utf8');

  console.log('\n========== 翻译结果 ==========');
  console.log('  残留中文叶子总数    :', totalResidue);
  console.log('  翻译记忆命中        :', tmHits);
  console.log('  通用术语表命中      :', glossaryHits);
  console.log('  Finance 术语命中    :', financeHits);
  console.log('  HRM 术语命中        :', hrmHits);
  console.log('  自动翻译合计        :', tmHits + glossaryHits + financeHits + hrmHits);
  console.log('  待人工/LLM 翻译     :', pending);
  console.log('  自动覆盖率          :', ((tmHits + glossaryHits + financeHits + hrmHits) / totalResidue * 100).toFixed(1) + '%');
  console.log('\n  Pending 按命名空间 Top 15:');
  const sorted = Object.entries(pendingByNs).sort((a, b) => b[1] - a[1]);
  for (const [ns, c] of sorted.slice(0, 15)) {
    console.log('    ' + ns + ': ' + c);
  }
  console.log('\n  Pending 清单已写入:', pendingPath);
}

main();
