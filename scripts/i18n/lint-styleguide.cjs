#!/usr/bin/env node
/**
 * R12 X-P0 Phase-2A: UI English Style Guide Lint Tool（v1.0 雏形）
 *
 * 用途：对 apps/web/src/i18n/locales/en/*.json（66 命名空间）的叶子字符串值
 *       对照 V227 Style Guide 8 章节规则进行 Lint，输出 HIGH/MEDIUM/LOW 三档告警。
 *
 * 支持模式：
 *   ① 默认 LINT 模式：只读扫描，不修改文件，exit 0/1 按阈值判定
 *   ② --FIX 模式（保留入口，内部复用 styleguide_apply.js 规则集；本次 v1.0 仅
 *       实现 lint-only，--fix 会提示并 delegate 到 styleguide_apply.js）
 *
 * CLI:
 *   node lint-styleguide.cjs [--fix] [--max-high N] [--max-medium N] [--max-low N]
 *                            [--ns <name>] [--json] [--sample N]
 *
 * 默认阈值（与 R12 X-P0 Phase-2C CI 严格条件一致）：
 *   --max-high 0    → HIGH 级 >0 即 fail
 *   --max-medium 50 → MEDIUM 级 ≤50
 *   --max-low  Infinity（不设限，LOW 仅报告不 fail）
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ========== 路径 ==========
const EN_DIR = path.resolve(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const ZH_DIR = EN_DIR.replace(/\/en$/, '/zh');

// ========== CLI 参数 ==========
const argv = process.argv.slice(2);
const FIX_MODE      = argv.includes('--fix');
const JSON_MODE     = argv.includes('--json');
const flagNum = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i+1]) return dflt;
  const n = parseInt(argv[i+1], 10);
  return isNaN(n) ? dflt : n;
};
const flagStr = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i+1]) return dflt;
  return argv[i+1];
};
const MAX_HIGH   = flagNum('--max-high', 0);
const MAX_MEDIUM = flagNum('--max-medium', 50);
const MAX_LOW    = flagNum('--max-low', Infinity);
const FILTER_NS  = flagStr('--ns', null);
const SAMPLE_N   = flagNum('--sample', 8);

// ========== §6 中国语境 26 组译法（反查 NON-STANDARD 译法 → HIGH） ==========
// 顺序：[ 标准译法 (from glossary.csv), 违规候选 regex 1 个或多个, HIGH理由 ]
const CN_CONTEXT_RULES = [
  // ── 财务/发票（来自 Finance 精修 Phase-3a 决策表，HIGH 级：专业错误）──
  { std: 'Invoice',          bad: [/Fapiao/gi, /发票/], reason: '§6 Finance: "发票" 必须 Invoice，不得保留拼音 Fapiao 或中文' },
  { std: 'Value-Added Tax (VAT)',  bad: [/[Zzengzhi[\s-]*[Ss]hui|增值税/], reason: '§6 Finance: "增值税" 须 Value-Added Tax 或 VAT' },
  { std: 'Special VAT Invoice', bad: [/[Ss]pecial\s*[Ff]apiao|专用发票/], reason: '§6 Finance: "增值税专用发票" 须 Special VAT Invoice' },
  { std: 'General VAT Invoice', bad: [/[Gg]eneral\s*[Ff]apiao|普通发票/], reason: '§6 Finance: "增值税普通发票" 须 General VAT Invoice' },
  { std: 'Tax Amount',       bad: [/[Ss]hui[\s-]*[Ee]|税额/], reason: '§6 Finance: "税额" = Tax Amount / Tax' },
  { std: 'Voucher',          bad: [/[Pp]ingzheng|凭证/], reason: '§6 Finance: 会计"凭证" = Voucher（不是 ticket/receipt）' },
  { std: 'Journal Entry',    bad: [/[Ff]enlu|分录/], reason: '§6 Finance: "分录" = Journal Entry / Entry（非 split-record）' },
  { std: 'Accounts Payable', bad: [/[Yy]ing[\s-]*[Ff]u|应付账款/], reason: '§6 Finance: "应付账款" = Accounts Payable (AP)' },
  { std: 'Accounts Receivable', bad: [/[Yy]ing[\s-]*[Ss]hou|应收账款/], reason: '§6 Finance: "应收账款" = Accounts Receivable (AR)' },

  // ── HRM 五险一金 / 劳动合同法（来自 Phase-3b 精修决策表，HIGH 级：中国语境）──
  { std: 'Social Insurance Contribution', bad: [/[Ww]u[\s-]*[Xx]ian[\s-]*[Yy]i[\s-]*[Jj]in|五险一金/], reason: '§6 HRM: "五险一金" = Social Insurance Contribution（不写 five-insurances）' },
  { std: 'Pension Insurance',  bad: [/[Yy]anglao|养老/], reason: '§6 HRM: "养老保险" = Pension Insurance / Basic Pension' },
  { std: 'Medical Insurance',  bad: [/[Yy]iliao|医疗/], reason: '§6 HRM: "医疗保险" = Medical Insurance' },
  { std: 'Unemployment Insurance', bad: [/[Ss]hiye|失业/], reason: '§6 HRM: "失业保险" = Unemployment Insurance' },
  { std: 'Work Injury Insurance', bad: [/[Gg]ongshang|工伤/], reason: '§6 HRM: "工伤保险" = Work Injury Insurance' },
  { std: 'Maternity Insurance', bad: [/[Ss]hengyu|生育/], reason: '§6 HRM: "生育保险" = Maternity Insurance' },
  { std: 'Housing Fund',       bad: [/[Gg]ong[\s-]*[Jj]ijin|公积金/], reason: '§6 HRM: "住房公积金" = Housing Fund / Housing Provident Fund' },
  { std: 'Labor Contract Law of the PRC', bad: [/[Ll]aodonghe.*[Ff]a|劳动合同法/], reason: '§6 HRM: 法律名称须 Labor Contract Law of the PRC / Labor Law（不写 "labor agreement law"）' },
  { std: 'Employment Contract', bad: [/[Ll]aodonghe[^法]*$|劳动合同[^法]/], reason: '§6 HRM: "劳动合同" = Employment Contract（非 Labor Contract）' },

  // ── §1 Labels 常见词规范性（LOW/MEDIUM 反查；非 HIGH，属大小写/复数） ──
  { std: 'Created At',        bad: [/^Create ?Time$|^CreateAt$|^Create_time$/i], reason: '§1 Labels: "创建时间" 规范 Created At（不用 CreateTime/CreateAt）', sev: 'MEDIUM' },
  { std: 'Updated At',        bad: [/^Update ?Time$|^UpdateAt$|^Update_time$/i], reason: '§1 Labels: "更新时间" = Updated At', sev: 'MEDIUM' },
  { std: 'Start Date',        bad: [/^StartTime$/i], reason: '§1 Labels: "开始时间" = Start Date（不用 StartTime）', sev: 'MEDIUM' },
  { std: 'End Date',          bad: [/^EndTime$/i], reason: '§1 Labels: "结束时间" = End Date', sev: 'MEDIUM' },
  { std: 'No data',           bad: [
      { re: /^NoData$/,                     label: 'CamelCase合并' },
      { re: /^No\s{2,}Data$/,               label: '多余空格' },
      { re: /^No Data$/,                    label: '第二个词误大写' },
      { re: /^no data$/,                    label: '全小写' },
      { re: /^NO DATA$/,                    label: '全大写' },
      { re: /^N\/A\s*:\s*NoData$/i,         label: '与 N/A 混合' },
    ], reason: '§4 Empty states: "无数据" 规范 "No data"（首词大写+单空格+data小写）', sev: 'MEDIUM' },
  { std: 'Confirm Delete',    bad: [/^ConfirmDelete$/i], reason: '§2 Modals: "确认删除" = Confirm Delete（空格分开）', sev: 'MEDIUM' },

  // ── §5 Grammar: 结果句式 "X failed" / "X successfully" ──（HIGH 级：违反 R10 统一规范）
  { std: 'X failed (sentence case)',  bad: [/^[A-Z][a-z]+(Failed)$/], reason: '§5 Grammar: 失败结果须 "X failed" sentence case（如 Create failed），不得 CamelCase CreateFailed', sev: 'HIGH' },
  { std: 'X successfully (ending)',   bad: [/^[A-Z][a-z]+(Success)$/], reason: '§5 Grammar: 成功结果须过去分词+successfully（如 Created successfully），不得 CreateSuccess', sev: 'HIGH' },

  // ── §5 Grammar: "Please input X" → "X is required"（HIGH 级：已 R11 X-P0 Phase-4b 清零） ──
  { std: 'X is required (Validation)', bad: [/^[Pp]lease\s+(input|enter|select|fill in)\s+.*[A-Za-z]/i], reason: '§4 Validation: 校验错误统一 "X is required"，禁止冗长 Please input/enter/select/fill in 句式', sev: 'HIGH' },
  { std: 'Chinese residue (Fake EN)', bad: [/[\u4e00-\u9fff]/], reason: '§8 Audit: 假 en 值（EN 译文残留 CJK 中文）', sev: 'HIGH' },
];

// ========== §5 Grammar:连字符/大小写/拼写 快速规则（MEDIUM 级） ==========
const MEDIUM_PATTERNS = [
  // §2 Buttons: "ConfirmDelete" 等 CamelCase 按钮（CN_CONTEXT 已覆盖 ConfirmDelete；此处补 ViewDetails/SaveEdit/EditData/RoleDelete 等）
  { id: '§2 button CamelCase',
    test: v => /^[A-Z][a-zA-Z]+(Cancel|Confirm|Details|Edit|Save|Delete|Submit|Approve|Reject|Review|Close|Reset)$/.test(v) && !/ /.test(v),
    reason: '§2 Buttons: 按钮文本禁止两个单词 CamelCase 合并，应用空格分开（Confirm Delete / View Details 等）' },
  // §1 Labels: 时间字段 CamelCase（CreatedAt/CreatedTime/ApprovedOn 等驼峰或下划线变体）
  { id: '§1 label time field naming',
    test: v => /(Time|At|On|Date)$/.test(v) && /[a-z][A-Z]/.test(v) && !/ /.test(v),
    reason: '§1 Labels: 时间字段应空格分开（Created At / Start Date / Approved On），不得用驼峰或下划线' },
  // §5 Grammar: Qty / No 缩写缺句点 — 仅在"编号/数量语境"命中（Invoice / Order / PO / SO / Ref / Doc / Serial# / Item 等），豁免 No data / Yes or No / Not applicable 等"No"作为副词的情形
  { id: '§5 abbreviation punctuation',
    test: v => {
      // No/Qty 后必须缺句点 (?!\.) 才判定违规；已有 No. / Qty. 的正确值不再误报
      const contextRe = /(Invoice|Order|PO\b|SO\b|Sales|Purchase|Reference\b|Ref\b|Document\b|Doc\b|Serial\b|Item\b|Product\b|Voucher\b|Batch\b|Lot\b)[\s\w&/-]*\s+(No|Qty)(?!\.)\b/i;
      if (v.length < 5) return false;
      if (!/\b(No|Qty)(?!\.)\b/.test(v)) return false;
      // 明确豁免：No data / No records / No items / Yes or No / "No," 开头否定句等 No 作为限定词用法
      if (/^No\s+(data|records|items|result|results|match|matches|permission|permissions|access|rows|entry|entries|info|information|change|changes|updates|update|user|users|role|roles|record|value|values|file|files|comment|comments|attachment|attachments)\b/i.test(v)) return false;
      if (/^Not?\b/i.test(v) && v.split(/\s+/).length <= 3) return false; // 简单否定句
      // 上下文相关命中才算缩写（Invoice No / Order Qty 等）
      return contextRe.test(v);
    },
    reason: '§5 Grammar: 编号/数量语境下缩写须加句点（Invoice No. / Order Qty.）' },
  // §5 Grammar: Oxford comma（list "X, Y and Z" → "X, Y, and Z"）
  { id: '§5.2 Oxford comma',
    test: v => {
      // 需满足：有 2+ 逗号分隔的名词短语，最后是 " and [A-Z][a-z]+"
      if (v.length < 15) return false;
      return /[A-Za-z][^,.]{2,40}, [^,.]{2,40} and [A-Z][a-z]{2,}/.test(v);
    },
    reason: '§5.2 Oxford comma: 并列三项推荐 "A, B, and C"（and 前加逗号）', sev: 'LOW' },
  // §3 Titles: 全大写非缩写 → Title Case（长度≥6 的普通词，排除纯数字+字母混合 ID / 短缩写 2-5）
  { id: '§3 title case (all caps non-acronym)',
    test: v => {
      const t = v.trim();
      if (t.length < 6) return false;
      if (/[0-9]/.test(t)) return false; // 含数字可能是 ID
      if (!/^[A-Z\s&/()\-–—:;'".,!?%$€£¥#@*+=<>[\]{}|\\]+$/.test(t)) return false; // 不全是全大写 + 标点
      if (!/[A-Z]/.test(t)) return false;
      // 常见短全大写短语豁免
      if (/^(N\/A|ETA|ETC|DIY|FAQ|FYI|ASAP|PO|SO|DOA|ETA|COD|BOM|SKU|KPI|OK|KO|QA|QC|R&D|HR|IT|ID|NO|YES|OPEN|CLOSED|PENDING|ACTIVE|INACTIVE|SUCCESS|FAILURE|CANCEL|APPROVE|REJECT|DRAFT|SUBMITTED|PUBLISHED|ARCHIVED|DELETED|EXPIRED|VALID|INVALID|LOCKED|UNLOCKED|ENABLED|DISABLED|ON|OFF|START|STOP|RUNNING|READY|NEW|USED|SOLD|RETURNED|SHIPPED|PAID|UNPAID|DONE|TODO|IN\s+PROGRESS|COMPLETED|FAILED|PAUSED|RESUMED|ERROR|WARN|INFO|DEBUG|TRACE|FATAL)$/i.test(t)) return false;
      return true;
    },
    reason: '§3 Titles: 普通列标题/菜单名推荐 Title Case（全大写仅限 2-5 字母缩写或单字状态词）', sev: 'LOW' },
];
const ACRONYM_RE = /^[A-Z]{2,5}$/;

// ========== 收集器 ==========
const counters = {
  HIGH: 0, MEDIUM: 0, LOW: 0,
  byCategory: new Map(),     // category → count
  byNs: new Map(),           // ns → {HIGH,MEDIUM,LOW}
  samples: [],               // flattened [{sev, ns, path, val, rule, reason}]
};
function record(sev, ns, kpath, val, rule) {
  if (FILTER_NS && ns !== FILTER_NS) return;
  counters[sev]++;
  const cat = rule.category || rule.id || 'Uncategorized';
  counters.byCategory.set(cat, (counters.byCategory.get(cat) || 0) + 1);
  if (!counters.byNs.has(ns)) counters.byNs.set(ns, {HIGH:0,MEDIUM:0,LOW:0});
  counters.byNs.get(ns)[sev]++;
  if (counters.samples.length < 500) {
    counters.samples.push({
      sev, ns, path: kpath, value: String(val).slice(0, 120),
      rule: rule.id || rule.std || '(anonymous)',
      reason: rule.reason || ''
    });
  }
}

// ========== 遍历 JSON 叶子 ==========
function walk(obj, ns, pathPrefix, cb) {
  if (obj == null) return;
  if (typeof obj === 'string') { cb(obj, pathPrefix); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, ns, `${pathPrefix}[${i}]`, cb)); return; }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) walk(obj[k], ns, pathPrefix ? `${pathPrefix}.${k}` : k, cb);
  }
}

// ========== 主流程 ==========
function main() {
  // --fix 委托到 styleguide_apply.js（R12 第一版 lint-only 雏形，fix 保留入口）
  if (FIX_MODE) {
    console.log('ℹ️  lint-styleguide v1.0: --fix 委托到 styleguide_apply.js（fix-based 工具）');
    const applyPath = path.join(__dirname, 'styleguide_apply.js');
    if (fs.existsSync(applyPath)) {
      const args = process.argv.slice(2).filter(x => x !== '--fix');
      require('child_process').execFileSync(process.execPath, [applyPath, ...args], { stdio: 'inherit' });
      process.exit(0);
    } else {
      console.error('❌  未找到 styleguide_apply.js，无法 --fix 模式');
      process.exit(2);
    }
  }

  if (!fs.existsSync(EN_DIR)) { console.error(`❌  EN_DIR not found: ${EN_DIR}`); process.exit(2); }
  const files = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).sort();

  for (const f of files) {
    const ns = f.replace(/\.json$/, '');
    const en = JSON.parse(fs.readFileSync(path.join(EN_DIR, f), 'utf8'));
    walk(en, ns, '', (val, kpath) => {
      if (val == null || typeof val !== 'string') return;
      if (val === '') return; // 空字符串在 en missing 独立检查（Phase-1），此处跳过

      // 1) §6 中国语境 NON-STANDARD 译法（HIGH 占绝大多数）
      for (const rule of CN_CONTEXT_RULES) {
        const sev = rule.sev || 'HIGH';
        for (const item of rule.bad) {
          let re;
          if (item instanceof RegExp) re = item;
          else if (typeof item === 'string') { re = new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')); }
          else if (item && item.re) re = item.re;
          else continue;
          if (re.test(val)) { record(sev, ns, kpath, val, rule); break; }
        }
      }

      // 2) §5 Grammar / §1 / §2 / §3 快速模式（MEDIUM / LOW）
      for (const rule of MEDIUM_PATTERNS) {
        // acronyms 豁免全大写（短缩写 2-5 字母）
        if (rule.id.startsWith('§3 title') && ACRONYM_RE.test(val.trim())) continue;
        try {
          if (rule.test(val)) {
            const sev = rule.sev || 'MEDIUM';
            record(sev, ns, kpath, val, rule);
          }
        } catch (_) { /* ignore */ }
      }
    });
  }

  // ========== 输出 ==========
  const { HIGH: h, MEDIUM: m, LOW: l } = counters;
  const ok = (h <= MAX_HIGH) && (m <= MAX_MEDIUM) && (l <= MAX_LOW);

  if (JSON_MODE) {
    const byNsArr = [];
    counters.byNs.forEach((v, k) => byNsArr.push({ ns: k, ...v, total: v.HIGH+v.MEDIUM+v.LOW }));
    byNsArr.sort((a,b) => b.total - a.total);
    const byCatArr = [];
    counters.byCategory.forEach((v, k) => byCatArr.push({ category: k, count: v }));
    byCatArr.sort((a,b) => b.count - a.count);
    const out = {
      tool: 'lint-styleguide.cjs',
      version: '1.0',
      thresholds: { HIGH: MAX_HIGH, MEDIUM: MAX_MEDIUM, LOW: MAX_LOW === Infinity ? null : MAX_LOW },
      summary: { HIGH: h, MEDIUM: m, LOW: l, total: h+m+l, pass: ok },
      by_namespace: byNsArr,
      by_category:  byCatArr,
      samples: counters.samples.slice(0, SAMPLE_N * 3),
    };
    process.stdout.write(JSON.stringify(out, null, 2));
    process.stdout.write('\n');
    process.exit(ok ? 0 : 1);
  }

  // ---------- 文本模式 ----------
  const bar = '═'.repeat(72);
  console.log(bar);
  console.log('  UI English Style Guide Lint — v1.0 (R12 X-P0 Phase-2A)');
  console.log(bar);
  console.log(`  命名空间     : ${files.length} 个 en.json`);
  console.log(`  过滤命名空间 : ${FILTER_NS ?? '(未启用，全量)'}`);
  console.log(`  严格阈值     : HIGH ≤ ${MAX_HIGH}  ·  MEDIUM ≤ ${MAX_MEDIUM}  ·  LOW ≤ ${MAX_LOW === Infinity ? '∞' : MAX_LOW}`);
  console.log('');
  console.log('  ┌──────────┬─────────┬─────────┬─────────┬─────────────┐');
  console.log('  │ Severity │   Count │ Thresh. │   Δ vs  │  Status     │');
  console.log('  ├──────────┼─────────┼─────────┼─────────┼─────────────┤');
  function row(sev, c, thr, sym) {
    const diff = c - thr;
    const pass = c <= thr;
    const delta = (thr === Infinity ? '—' : (diff <= 0 ? ` ${diff}`.padStart(5) : `+${diff}`.padStart(5)));
    const mark = pass ? `✅ ${sym}` : `❌ ${sym}`;
    console.log(`  │ ${sev.padEnd(8)} │ ${String(c).padStart(7)} │ ${String(thr === Infinity ? '∞ ':thr).padStart(7)} │ ${delta.padStart(7)} │  ${mark}  │`);
  }
  row('HIGH',   h, MAX_HIGH,   'H');
  row('MEDIUM', m, MAX_MEDIUM, 'M');
  row('LOW',    l, MAX_LOW,    'L');
  console.log('  └──────────┴─────────┴─────────┴─────────┴─────────────┘');
  console.log('');

  // 按分类
  if (counters.byCategory.size > 0) {
    console.log('  ┌─ 告警按 Style Guide 章节/规则分类：');
    const cats = [...counters.byCategory.entries()].sort((a,b) => b[1] - a[1]).slice(0, 15);
    for (const [cat, c] of cats) console.log(`  │   ${String(c).padStart(5)}  ${cat}`);
    console.log('  └');
    console.log('');
  }

  // 按命名空间 Top 15
  if (counters.byNs.size > 0) {
    const nsArr = [...counters.byNs.entries()].map(([n,v]) => [n, v.HIGH+v.MEDIUM+v.LOW, v.HIGH, v.MEDIUM, v.LOW]).sort((a,b)=>b[1]-a[1]).slice(0, 15);
    console.log('  ┌─ 告警按命名空间 Top 15（Total / H / M / L）：');
    console.log('  │   Total  H  M  L   namespace');
    for (const [n, t, hi, me, lo] of nsArr) console.log(`  │   ${String(t).padStart(5)} ${String(hi).padStart(2)} ${String(me).padStart(2)} ${String(lo).padStart(2)}   ${n}`);
    console.log('  └');
    console.log('');
  }

  // 样本（每个严重度 SAMPLE_N）
  const pickSamples = (sev, n) => counters.samples.filter(s => s.sev === sev).slice(0, n);
  for (const sev of ['HIGH','MEDIUM','LOW']) {
    const samps = pickSamples(sev, SAMPLE_N);
    if (!samps.length) continue;
    const tag = sev === 'HIGH' ? '🚨' : sev === 'MEDIUM' ? '⚠️' : '💡';
    console.log(`  ${tag}  ${sev} 样本（Top ${samps.length}）：`);
    for (const s of samps) {
      console.log(`     · [${s.ns}${s.path ? ':'+s.path:''}]  rule=${s.rule}`);
      console.log(`        value: "${s.value}"`);
      if (s.reason) console.log(`        why  : ${s.reason}`);
    }
    console.log('');
  }

  console.log(bar);
  if (ok) {
    console.log(`  ✅  Lint PASS：HIGH=${h} ≤ ${MAX_HIGH} · MEDIUM=${m} ≤ ${MAX_MEDIUM} · LOW=${l} ≤ ${MAX_LOW === Infinity ? '∞' : MAX_LOW}`);
    console.log(bar);
    process.exit(0);
  } else {
    console.log('  ❌  Lint FAIL（触发至少一个阈值）：');
    if (h > MAX_HIGH)   console.log(`     · HIGH   ${h}  >  ${MAX_HIGH}（须 ${h-MAX_HIGH} 处）`);
    if (m > MAX_MEDIUM) console.log(`     · MEDIUM ${m}  >  ${MAX_MEDIUM}（须 ${m-MAX_MEDIUM} 处）`);
    if (l > MAX_LOW)    console.log(`     · LOW    ${l}  >  ${MAX_LOW}（须 ${l-MAX_LOW} 处）`);
    console.log(bar);
    process.exit(1);
  }
}

main();

// CI 全流水线触发标记（i18n path filter hit）
